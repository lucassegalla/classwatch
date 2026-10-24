import base64
import difflib
import json
import os
import re
import shutil
import sys
import unicodedata
import warnings
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
warnings.filterwarnings("ignore")

TRANSCRICAO_PREFIX = "CLASSWATCH_TRANSCRICAO:"
RESUMO_PREFIX = "CLASSWATCH_RESUMO:"
STATUS_PREFIX = "CLASSWATCH_STATUS:"
ERROR_PREFIX = "CLASSWATCH_ERROR:"
WHISPER_INITIAL_PROMPT = (
    "Transcrição em português do Brasil de uma aula acadêmica. Preserve termos técnicos, siglas "
    "e nomes próprios. Vocabulário de bancos de dados e SQL: banco de dados, consultar informações, "
    "amplamente empregado, Structured Query Language, SQL, SELECT, INSERT, UPDATE, DELETE, WHERE, "
    "NOT NULL, chave primária, chave estrangeira, relacionamento, integridade dos dados. "
    "Mantenha comandos SQL em letras maiúsculas quando forem mencionados como comandos."
)


def encode_output(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def parse_model_json(content: str) -> dict:
    content = content.strip()

    if content.startswith("```"):
        content = re.sub(
            r"^```(?:json)?\s*",
            "",
            content,
            flags=re.IGNORECASE,
        )

        content = re.sub(
            r"\s*```$",
            "",
            content,
        )

    return json.loads(content)


SUMMARY_KEYS = {
    "overview": ("visao_geral", "overview", "summary", "resumo"),
    "main_ideas": ("ideias_centrais", "ideias_principais", "main_ideas", "mainIdeas", "key_points", "keyPoints"),
    "concepts": ("conceitos_definicoes", "conceitos_e_definicoes", "concepts", "concepts_and_definitions", "conceptsAndDefinitions"),
    "relations": ("relacoes_entre_ideias", "relacoes_entre_conceitos", "relations", "relations_between_concepts", "relationsBetweenConcepts"),
    "examples": ("exemplos_apresentados", "examples"),
    "questions": ("perguntas_respostas", "perguntas_e_respostas", "questions", "review_questions", "reviewQuestions"),
}


def _as_text(value: object) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, (int, float, bool)):
        return str(value)
    return ""


def _comparison_key(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold())
    without_accents = "".join(char for char in folded if not unicodedata.combining(char))
    return " ".join(re.findall(r"[a-z0-9]+", without_accents))


def _field_key(value: str) -> str:
    return _comparison_key(re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value))


GENERIC_SUMMARY_TEXT = {
    "ideia principal", "ideias principais", "conceito", "conceito importante",
    "definicao", "relacao", "exemplo", "nao informado", "nao especificado",
    "informacao insuficiente", "conteudo insuficiente para resumo",
    "consulte a transcricao para mais contexto", "resumo indisponivel",
    "sem informacao suficiente", "n a", "n d",
}
def _has_explanatory_content(title: str, text: str, minimum_words: int | None = None) -> bool:
    key = _comparison_key(text)
    title_key = _comparison_key(title)
    words = key.split()
    if (not words or key in GENERIC_SUMMARY_TEXT
            or "conteudo insuficiente para resumo" in key
            or "consulte a transcricao para mais contexto" in key
            or title_key in GENERIC_SUMMARY_TEXT or (title_key and key == title_key)):
        return False
    # Avoid accepting headings and copied labels while allowing valid verbs
    # and technical wording outside a hard-coded vocabulary.
    threshold = minimum_words if minimum_words is not None else (3 if title else 4)
    return len(words) >= threshold


def _as_entries(value: object, pair: bool = False) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    if isinstance(value, dict):
        source = [{"title": key, "explanation": item} for key, item in value.items()] if pair else []
    elif isinstance(value, list):
        source = value
    elif isinstance(value, str) and value.strip():
        source = [line.lstrip("-•* ").strip() for line in value.splitlines() if line.strip()]
    else:
        source = []
    for item in source:
        if isinstance(item, dict):
            fields = {_field_key(str(key)): item[key] for key in item}
            title = _as_text(next((fields[key] for key in ("title", "term", "termo", "conceito", "pergunta", "question", "name", "label") if key in fields), None))
            explanation = _as_text(next((fields[key] for key in ("explanation", "definition", "definicao", "descricao", "description", "resposta", "answer", "text", "content") if key in fields), None))
            if not _has_explanatory_content(title, explanation, 3 if title else 6):
                continue
            candidate = {"title": title, "text": explanation}
        else:
            text = _as_text(item)
            if ":" in text:
                possible_title, possible_text = text.split(":", 1)
                if _has_explanatory_content(possible_title.strip(), possible_text.strip()):
                    candidate = {"title": possible_title.strip(), "text": possible_text.strip()}
                else:
                    continue
            elif _has_explanatory_content("", text, 6):
                candidate = {"title": "", "text": text}
            else:
                continue
        content_key = _comparison_key(candidate["text"])
        if content_key and all(_comparison_key(entry["text"]) != content_key for entry in entries):
            entries.append(candidate)
    return entries


REVIEW_QUESTION_STARTS = (
    "o que ", "qual ", "quais ", "quem ", "quando ", "onde ", "como ",
    "por que ", "para que ", "em que ", "de que ", "com que ", "a que ",
    "quanto ", "quantos ", "quantas ", "a diferenca entre ",
)


def _is_review_question(value: str) -> bool:
    question = value.strip()
    key = _comparison_key(question)
    return question.endswith("?") and any(key.startswith(prefix) for prefix in REVIEW_QUESTION_STARTS)


def _similar_review_question(left: str, right: str) -> bool:
    left_key = _comparison_key(left)
    right_key = _comparison_key(right)
    return bool(left_key and right_key and difflib.SequenceMatcher(None, left_key, right_key).ratio() >= 0.9)


def _as_questions(value: object) -> list[dict[str, str]]:
    if isinstance(value, dict):
        source = [{"question": question, "answer": answer} for question, answer in value.items()]
    elif isinstance(value, list):
        source = value
    elif isinstance(value, str):
        source = [line.strip().lstrip("-•* ") for line in value.splitlines() if line.strip()]
    else:
        source = []

    questions: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in source:
        question = ""
        answer = ""
        if isinstance(item, dict):
            fields = {_field_key(str(key)): item[key] for key in item}
            question = _as_text(next((fields[key] for key in ("question", "pergunta", "title") if key in fields), None))
            answer = _as_text(next((fields[key] for key in ("answer", "resposta", "explanation", "text", "content") if key in fields), None))
        else:
            question = _as_text(item)

        if not _is_review_question(question):
            continue
        key = _comparison_key(question)
        if not key or any(_similar_review_question(key, existing) for existing in seen):
            continue
        if answer and not _has_explanatory_content(question, answer, 3):
            continue
        questions.append({"title": question, "text": answer})
        seen.add(key)
    return questions


def normalize_summary(value: object) -> dict:
    """Convert supported model responses into a stable, display-friendly schema."""
    if isinstance(value, str):
        try:
            value = parse_model_json(value)
        except (ValueError, TypeError):
            overview = value.strip()
            return {"overview": overview if _has_explanatory_content("", overview) else "", "main_ideas": [], "concepts": [], "relations": [], "examples": [], "questions": []}
    if isinstance(value, list):
        value = {"ideias_centrais": value}
    if not isinstance(value, dict):
        value = {}
    normalized: dict = {}
    fields = {_field_key(str(key)): item for key, item in value.items()}
    for target, aliases in SUMMARY_KEYS.items():
        found = next((fields[_field_key(key)] for key in aliases if _field_key(key) in fields), None)
        if target == "overview":
            overview = _as_text(found)
            normalized[target] = overview if _has_explanatory_content("", overview) else ""
        elif target == "questions":
            normalized[target] = _as_questions(found)
        else:
            normalized[target] = _as_entries(found, pair=target == "concepts")
    return normalized


def merge_summaries(parts: list[dict]) -> dict:
    result = normalize_summary({})
    for index, part in enumerate(parts):
        normalized = normalize_summary(part)
        if not result["overview"] and normalized["overview"]:
            result["overview"] = normalized["overview"]
        elif normalized["overview"].startswith(("Material de revisão parcial", "Transcrição com informação insuficiente", "Não foi possível validar o resumo")):
            result["overview"] = f'{result["overview"]}\n\n{normalized["overview"]}'.strip()
        for key in ("concepts", "main_ideas", "relations", "examples"):
            seen = {_comparison_key(entry["text"]) for entry in result[key]}
            other_sections = {other: {_comparison_key(entry["text"]) for entry in result[other]} for other in ("concepts", "main_ideas", "relations", "examples") if other != key}
            for entry in normalized[key]:
                content = _comparison_key(entry["text"])
                if content and content not in seen and not any(content in values for values in other_sections.values()):
                    result[key].append(entry)
                    seen.add(content)
        for entry in normalized["questions"]:
            if not any(_similar_review_question(entry["title"], existing["title"]) for existing in result["questions"]):
                result["questions"].append(entry)
    return result


class InsufficientSummaryError(ValueError):
    pass


def split_text(text: str, max_chars: int = 12000) -> list[str]:
    """Split in order near sentence boundaries, preserving every character of content."""
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    chunks: list[str] = []
    current = ""
    for sentence in sentences:
        while len(sentence) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            boundary = sentence.rfind(" ", 0, max_chars + 1)
            if boundary <= 0:
                boundary = max_chars
            chunks.append(sentence[:boundary].strip())
            sentence = sentence[boundary:].strip()
        candidate = f"{current} {sentence}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = sentence
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def insufficient_transcript(text: str) -> bool:
    words = re.findall(r"\b[\wÀ-ÿ]+\b", text, flags=re.UNICODE)
    meaningful = {_comparison_key(word) for word in words if len(_comparison_key(word)) > 2}
    return len(words) < 12 or len(meaningful) < 5


def _insufficient_result(text: str) -> tuple[str, str, str, str | None]:
    material = normalize_summary({
        "overview": "A transcrição é muito curta ou repetitiva para formar um resumo confiável.",
    })
    return text, json.dumps(material, ensure_ascii=False), "INSUFFICIENT", None


def generate_study_material(
    transcription: str,
    client=None,
    api_key: str | None = None,
    model_name: str | None = None,
) -> tuple[str, str, str, str | None]:
    """Generate a summary from an existing transcript, without invoking Whisper."""
    text = re.sub(r"\s+", " ", transcription or "").strip()
    if insufficient_transcript(text):
        return _insufficient_result(text)

    key = (api_key if api_key is not None else os.getenv("OPENAI_API_KEY", "")).strip()
    if client is None and not key:
        return text, "", "FAILED", "Resumo não gerado: serviço de IA não configurado. Configure a chave de API no backend e tente novamente."
    try:
        if client is None:
            from openai import OpenAI
            client = OpenAI(api_key=key, timeout=120.0, max_retries=2)
    except ImportError:
        return text, "", "FAILED", "Resumo não gerado: componente de IA indisponível no servidor."

    openai_model = (model_name or os.getenv("OPENAI_MODEL", "gpt-4o-mini")).strip() or "gpt-4o-mini"
    system_prompt = """
Você transforma transcrições de aulas em material de estudo.
Use exclusivamente informações afirmadas ou explicadas na transcrição. Não complete lacunas com conhecimento externo.
Escreva explicações em frases completas. Títulos sozinhos, conteúdo repetido ou listas de palavras sem explicação não são respostas válidas.
Quando não houver informação suficiente para explicar um conceito, deixe o item de fora. Não invente definições nem relações causais.
Na seção perguntas_respostas, escreva perguntas reais em português: cada pergunta deve começar com uma expressão interrogativa (por exemplo: O que, Qual, Quais, Como, Por que, Para que ou Em que), terminar com ponto de interrogação e ter uma resposta fundamentada na transcrição. Não transforme afirmações em perguntas apenas acrescentando "?". Se não houver base para uma pergunta útil, omita-a.
Retorne um único objeto JSON válido com a chave "resumo" e as seções visao_geral, ideias_centrais, conceitos_definicoes, relacoes_entre_ideias, exemplos_apresentados e perguntas_respostas.
""".strip()

    chunks = split_text(text)
    summaries: list[dict] = []
    try:
        for index, chunk in enumerate(chunks, start=1):
            user_prompt = f"""
Crie material de revisão somente com base neste trecho ({index} de {len(chunks)}; ordem original).

- ideias_centrais: tópicos que expliquem o ponto e sua importância na aula.
- conceitos_definicoes: termos com definições completas presentes no trecho.
- relacoes_entre_ideias: explique como os conceitos se conectam; registre causa e efeito apenas quando a transcrição os afirmar.
- exemplos_apresentados: preserve exemplos e o que eles demonstram.
- perguntas_respostas: zero ou mais perguntas reais de revisão, cada uma começando com expressão interrogativa, terminando em "?" e respondida com evidência do trecho. Não escreva afirmações nesta seção.
- Cada item deve ter um título e uma explicação substancial. Não repita o título como explicação.
- Evite repetir a mesma informação em seções diferentes. Use listas vazias quando não houver evidência.
- Se o trecho não trouxer explicações suficientes, devolva as seções vazias. Não produza itens genéricos.
- Não invente perguntas para preencher a seção; deixe-a vazia quando o trecho não oferecer uma pergunta útil e respondível.

Retorne JSON no formato {{"resumo":{{"visao_geral":"introdução baseada no trecho","ideias_centrais":[{{"title":"tema","explanation":"explicação completa"}}],"conceitos_definicoes":[{{"term":"termo","definition":"definição completa"}}],"relacoes_entre_ideias":[{{"title":"relação","explanation":"conexão explicada"}}],"exemplos_apresentados":[],"perguntas_respostas":[{{"question":"pergunta","answer":"resposta fundamentada"}}]}}}}.

TRANSCRIÇÃO:
{chunk}
""".strip()
            response = client.chat.completions.create(
                model=openai_model,
                temperature=0.1,
                response_format={"type": "json_object"},
                messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            )
            content = response.choices[0].message.content
            if not content:
                raise ValueError("empty response")
            parsed = parse_model_json(content)
            summary = normalize_summary(parsed.get("resumo", parsed))
            if not any(summary[section] for section in ("main_ideas", "concepts", "relations")):
                raise ValueError("summary has no explanatory study sections")
            summaries.append(summary)

        merged = merge_summaries(summaries)
        if not any(merged[section] for section in ("main_ideas", "concepts", "relations")):
            raise ValueError("summary contains no explanatory study sections")
        return text, json.dumps(merged, ensure_ascii=False), "GENERATED", None
    except Exception:
        # Provider exceptions and malformed responses are deliberately not logged
        # or returned verbatim; they can contain request metadata.
        return text, "", "FAILED", "Não foi possível gerar um resumo válido. A transcrição foi preservada; tente gerar o resumo novamente."


def process_audio(audio_path: Path) -> tuple[str, str, str, str | None]:
    if not audio_path.exists() or not audio_path.is_file():
        raise FileNotFoundError(f"Arquivo de áudio não encontrado: {audio_path}")
    if audio_path.stat().st_size == 0:
        raise ValueError("O arquivo de áudio está vazio")

    max_bytes = int(os.getenv("CLASSWATCH_MAX_AUDIO_BYTES", str(50 * 1024 * 1024)))
    if audio_path.stat().st_size > max_bytes:
        raise ValueError("O arquivo de áudio excede o limite configurado")
    if not shutil.which("ffmpeg"):
        raise RuntimeError("FFmpeg não encontrado no PATH")
    try:
        import torch
        import whisper
    except ImportError as exc:
        raise RuntimeError("Dependências Python do Whisper não instaladas") from exc

    whisper_model = os.getenv("WHISPER_MODEL", "small").strip() or "small"
    model = whisper.load_model(whisper_model)
    result = model.transcribe(
        str(audio_path),
        language="pt",
        verbose=False,
        fp16=torch.cuda.is_available(),
        initial_prompt=WHISPER_INITIAL_PROMPT,
    )
    transcript = re.sub(r"\s+", " ", str(result.get("text", ""))).strip()
    if not transcript:
        raise RuntimeError("O Whisper não conseguiu gerar uma transcrição para o áudio")
    return generate_study_material(transcript)


def main() -> int:
    try:
        if len(sys.argv) == 2 and sys.argv[1] == "--summarize-stdin":
            transcription = sys.stdin.read()
            result = generate_study_material(transcription)
        elif len(sys.argv) == 2:
            result = process_audio(Path(sys.argv[1]))
        else:
            print("Uso: python transcricao.py <caminho_do_audio> | --summarize-stdin", file=sys.stderr)
            return 2

        transcricao, resumo, status, error = result

        print(f"{TRANSCRICAO_PREFIX}{encode_output(transcricao)}")
        print(f"{RESUMO_PREFIX}{encode_output(resumo)}")
        print(f"{STATUS_PREFIX}{status}")
        if error:
            print(f"{ERROR_PREFIX}{encode_output(error)}")

        return 0

    except Exception as exc:
        print(
            f"{type(exc).__name__}: {exc}",
            file=sys.stderr,
        )

        return 1


if __name__ == "__main__":
    raise SystemExit(main())
