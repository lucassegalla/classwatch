import sys
import whisper
import warnings
import os
# from openai import OpenAI  # ❌ não usado agora

# -----------------------------
# Configuração
# -----------------------------
sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings("ignore")

audio_path = sys.argv[1]

# -----------------------------
# 1. Whisper (transcrição bruta)
# -----------------------------
model = whisper.load_model("small")
resultado = model.transcribe(audio_path, language="pt")

texto_bruto = resultado["text"]

# -----------------------------
# 2. OpenAI (DESATIVADO POR ENQUANTO)
# -----------------------------
# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------
# 3. Prompt (DESATIVADO)
# -----------------------------
# prompt = f"""
# Você recebe uma transcrição de aula com erros.
#
# Tarefas:
# 1. Corrigir português e palavras quebradas
# 2. Melhorar coerência do texto
# 3. Manter significado original
# 4. Criar resumo em tópicos
#
# Formato obrigatório:
#
# ###TRANSCRICAO###
# (texto corrigido)
#
# ###RESUMO###
# - tópico 1
# - tópico 2
# - tópico 3
#
# Texto:
# {texto_bruto}
# """

# -----------------------------
# 4. Chamada da IA (DESATIVADA)
# -----------------------------
# response = client.chat.completions.create(
#     model="gpt-4o-mini",
#     messages=[
#         {"role": "user", "content": prompt}
#     ]
# )
#
# saida = response.choices[0].message.content

# -----------------------------
# 5. Retorno para Java
# -----------------------------

print(texto_bruto.strip())