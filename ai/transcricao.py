import sys
import whisper
import warnings
import os
import re
from openai import OpenAI

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

# 🔧 limpeza do texto (IMPORTANTE)
texto_limpo = re.sub(r'\s+', ' ', texto_bruto).strip()

# -----------------------------
# 2. Cliente OpenAI
# -----------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------
# 3. Prompt
# -----------------------------
prompt = f"""
Você recebe uma transcrição de aula com erros, cortes e partes sem sentido.

TAREFA 1:
Reescreva completamente a transcrição:
- Corrija português
- Reconstrua frases quebradas
- Preencha partes sem contexto de forma coerente
- Mantenha o significado original
- Transforme em um texto fluido e compreensível

TAREFA 2:
Com base APENAS na transcrição reescrita acima:
- Crie um resumo em tópicos
- Use apenas os pontos mais importantes
- Use quantos tópicos forem necessários
- Seja direto e objetivo

FORMATO OBRIGATÓRIO:

###TRANSCRICAO###
(texto totalmente reescrito e corrigido)

###RESUMO###
- tópico 1
- tópico 2
- ...

TRANSCRIÇÃO ORIGINAL:
{texto_bruto}
"""

# -----------------------------
# 4. Chamada da IA
# -----------------------------
response = client.chat.completions.create(
    model="gpt-4o-mini",
    temperature=0.2,
    messages=[
        {"role": "user", "content": prompt}
    ]
)

saida = response.choices[0].message.content

# -----------------------------
# 5. Retorno para Java
# -----------------------------
print(saida.strip())