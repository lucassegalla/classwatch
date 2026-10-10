import base64
import json
import os
import re
import sys
import warnings
from pathlib import Path

import torch
import whisper
from openai import OpenAI

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
warnings.filterwarnings("ignore")

TRANSCRICAO_PREFIX = "CLASSWATCH_TRANSCRICAO:"
RESUMO_PREFIX = "CLASSWATCH_RESUMO:"


def encode_output(value: str) -> str:
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def parse_model_json(content: str) -> dict:
    content = content.strip()

    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*", "", content, flags=re.IGNORECASE)
        content = re.sub(r"\s*```$", "", content)

    return json.loads(content)


def process_audio(audio_path: Path) -> tuple[str, str]:
    if not audio_path.exists() or not audio_path.is_file():
        raise FileNotFoundError(f"Arquivo de áudio não encontrado: {audio_path}")

    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY não configurada")

    whisper_model = os.getenv("WHISPER_MODEL", "small").strip() or "small"
    openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini"

    model = whisper.load_model(whisper_model)
    resultado = model.transcribe(
        str(audio_path),
        language="pt",
        verbose=False,
        fp16=torch.cuda.is_available(),
    )

    texto_bruto = str(resultado.get("text", ""))
    texto_limpo = re.sub(r"\s+", " ", texto_bruto).strip()

    if not texto_limpo:
        raise RuntimeError("O Whisper não conseguiu gerar uma transcrição para o áudio")

    client = OpenAI(
        api_key=api_key,
        timeout=120.0,
        max_retries=2,
    )

    system_prompt = """
Você organiza transcrições de aulas para estudo.
Sua prioridade é preservar o conteúdo realmente presente na transcrição.
Nunca invente explicações, fatos, exemplos ou trechos que não estejam sustentados pelo texto recebido.
Se um trecho estiver incompleto e não puder ser reconstruído com segurança, preserve a incerteza usando [trecho inaudível].
Retorne apenas um objeto JSON válido com as chaves "transcricao" e "resumo".
""".strip()

    user_prompt = f"""
Revise a transcrição abaixo seguindo estas regras:

1. Corrija ortografia, pontuação e concordância.
2. Organize frases quebradas somente quando houver contexto suficiente.
3. Remova repetições e vícios de fala que não alterem o conteúdo.
4. Não acrescente conhecimento externo e não complete lacunas por suposição.
5. Preserve termos técnicos, conceitos, exemplos e explicações apresentados na aula.
6. Na chave "transcricao", devolva um texto claro e fiel ao conteúdo original.
7. Na chave "resumo", devolva um resumo objetivo em tópicos usando hífen no início de cada tópico.

TRANSCRIÇÃO ORIGINAL:
{texto_limpo}
""".strip()

    response = client.chat.completions.create(
        model=openai_model,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("A OpenAI retornou uma resposta vazia")

    parsed = parse_model_json(content)
    transcricao = str(parsed.get("transcricao", "")).strip()
    resumo = str(parsed.get("resumo", "")).strip()

    if not transcricao:
        raise RuntimeError("A resposta da IA não contém uma transcrição válida")

    if not resumo:
        raise RuntimeError("A resposta da IA não contém um resumo válido")

    return transcricao, resumo


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python transcricao.py <caminho_do_audio>", file=sys.stderr)
        return 2

    try:
        transcricao, resumo = process_audio(Path(sys.argv[1]))
        print(f"{TRANSCRICAO_PREFIX}{encode_output(transcricao)}")
        print(f"{RESUMO_PREFIX}{encode_output(resumo)}")
        return 0
    except Exception as exc:
        print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
