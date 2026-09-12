"""Transcreve uma aula e devolve um JSON consumido pelo backend Java."""

from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any


def normalizar_texto(texto: str) -> str:
    """Remove espaços repetidos sem alterar o conteúdo reconhecido."""
    return re.sub(r"\s+", " ", texto).strip()


def transcrever_audio(audio_path: Path) -> str:
    import whisper

    model_name = os.getenv("WHISPER_MODEL", "small")
    model = whisper.load_model(model_name)
    resultado = model.transcribe(str(audio_path), language="pt", verbose=False)
    texto = normalizar_texto(str(resultado.get("text", "")))

    if not texto:
        raise RuntimeError("O Whisper não reconheceu conteúdo no áudio")

    return texto


def organizar_conteudo(texto: str) -> dict[str, str]:
    from openai import OpenAI

    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("A variável OPENAI_API_KEY não está configurada")

    client = OpenAI()
    model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    response = client.chat.completions.create(
        model=model_name,
        temperature=0.1,
        response_format={"type": "json_object"},
        messages=[
            {
                "role": "system",
                "content": (
                    "Você organiza transcrições acadêmicas em português. "
                    "Preserve rigorosamente o conteúdo original. Nunca invente informações, "
                    "exemplos, termos ou conclusões. Quando um trecho não puder ser recuperado "
                    "com segurança, marque-o como [inaudível]. Responda somente com JSON válido."
                ),
            },
            {
                "role": "user",
                "content": (
                    "Revise a transcrição abaixo, corrigindo pontuação, ortografia e frases "
                    "quebradas apenas quando o significado estiver claro. Depois produza um "
                    "resumo objetivo em tópicos, usando somente informações presentes na aula. "
                    "Retorne exatamente um objeto com duas strings: "
                    '{"transcricao":"...","resumo":"- tópico 1\\n- tópico 2"}.\n\n'
                    f"TRANSCRIÇÃO ORIGINAL:\n{texto}"
                ),
            },
        ],
    )

    content = response.choices[0].message.content
    if not content:
        raise RuntimeError("A OpenAI retornou uma resposta vazia")

    return validar_resultado(json.loads(content))


def validar_resultado(resultado: Any) -> dict[str, str]:
    if not isinstance(resultado, dict):
        raise ValueError("A resposta da IA não é um objeto JSON")

    transcricao = resultado.get("transcricao")
    resumo = resultado.get("resumo")

    if not isinstance(transcricao, str) or not transcricao.strip():
        raise ValueError("A resposta da IA não contém uma transcrição válida")
    if not isinstance(resumo, str):
        raise ValueError("A resposta da IA não contém um resumo válido")

    return {
        "transcricao": transcricao.strip(),
        "resumo": resumo.strip(),
    }


def processar(audio_path: Path) -> dict[str, str]:
    if not audio_path.is_file():
        raise FileNotFoundError(f"Arquivo de áudio não encontrado: {audio_path}")

    texto_bruto = transcrever_audio(audio_path)
    return organizar_conteudo(texto_bruto)


def main() -> int:
    if len(sys.argv) != 2:
        print("Uso: python transcricao.py <caminho-do-audio>", file=sys.stderr)
        return 2

    try:
        resultado = processar(Path(sys.argv[1]).expanduser().resolve())
        print(json.dumps(resultado, ensure_ascii=False))
        return 0
    except Exception as exception:
        print(f"Falha no processamento: {exception}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
