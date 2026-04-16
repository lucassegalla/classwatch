import sys
import whisper
import warnings

sys.stdout.reconfigure(encoding='utf-8')
warnings.filterwarnings("ignore")

# argumento vindo do Java
audio_path = sys.argv[1]

model = whisper.load_model("small")

resultado = model.transcribe(audio_path, language="pt")

# imprime no console (Java vai ler isso)
print(resultado["text"])