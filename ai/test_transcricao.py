import base64
import io
import sys
import tempfile
import unittest
from types import SimpleNamespace
from pathlib import Path
from unittest.mock import patch

import transcricao


class TranscricaoTests(unittest.TestCase):
    def test_encode_output_preserva_unicode(self):
        encoded = transcricao.encode_output("aula de biologia: célula")
        self.assertEqual(base64.b64decode(encoded).decode("utf-8"), "aula de biologia: célula")

    def test_parse_model_json_aceita_bloco_markdown(self):
        self.assertEqual(transcricao.parse_model_json('```json\n{"resumo":"- ponto"}\n```'), {"resumo": "- ponto"})

    def test_parse_model_json_rejeita_resposta_malformada(self):
        with self.assertRaises(ValueError):
            transcricao.parse_model_json("não é json")

    def test_normalize_summary_structures_legacy_and_modern_material(self):
        modern = transcricao.normalize_summary({
            "visao_geral": "A aula apresenta bancos relacionais.",
            "ideias_centrais": [{"title": "Chaves", "explanation": "Relacionam os registros das tabelas."}],
            "conceitos_definicoes": {"Chave primária": "Identifica cada registro."},
            "perguntas_respostas": [{"pergunta": "O que identifica um registro?", "resposta": "A chave primária identifica cada registro."}],
        })
        self.assertEqual(modern["overview"], "A aula apresenta bancos relacionais.")
        self.assertEqual(modern["main_ideas"][0]["text"], "Relacionam os registros das tabelas.")
        self.assertEqual(modern["concepts"][0]["title"], "Chave primária")
        self.assertEqual(modern["questions"][0]["text"], "A chave primária identifica cada registro.")

    def test_normalize_summary_discards_repeated_empty_and_generic_entries(self):
        normalized = transcricao.normalize_summary({
            "visao_geral": "Efeito estufa",
            "ideias_centrais": [
                {"title": "Efeito estufa", "explanation": "Efeito estufa"},
                {"title": "Ideia principal", "explanation": "Ideia principal"},
                {"title": "Ideia principal", "explanation": "Gases na atmosfera retêm parte do calor terrestre."},
                {"title": "Efeito estufa", "explanation": "Gases na atmosfera retêm parte do calor terrestre."},
                {"title": "Efeito estufa", "explanation": "Gases na atmosfera retêm parte do calor terrestre."},
            ],
            "conceitos_definicoes": {"Aquecimento global": "Aquecimento global"},
            "relacoes_entre_ideias": [{"title": "Atividades humanas e efeito estufa", "explanation": "Atividades humanas e efeito estufa"}],
        })
        self.assertEqual(normalized["overview"], "")
        self.assertEqual(len(normalized["main_ideas"]), 1)
        self.assertEqual(normalized["concepts"], [])
        self.assertEqual(normalized["relations"], [])

    def test_review_questions_require_real_interrogative_form_and_deduplicate(self):
        normalized = transcricao.normalize_summary({
            "perguntas_respostas": [
                {"question": "Qual é a função de uma chave primária?", "answer": "Ela identifica exclusivamente cada registro de uma tabela."},
                {"question": "Qual a função de uma chave primária?", "answer": "Ela identifica os registros da tabela."},
                {"question": "As chaves primárias identificam exclusivamente cada registro?", "answer": "A chave primária identifica um registro."},
                {"question": "Chaves primárias", "answer": "Uma chave primária identifica exclusivamente cada registro."},
            ]
        })

        self.assertEqual(len(normalized["questions"]), 1)
        question = normalized["questions"][0]
        self.assertEqual(question["title"], "Qual é a função de uma chave primária?")
        self.assertTrue(question["title"].endswith("?"))
        self.assertIn("identifica exclusivamente", question["text"])

    def test_merge_summaries_preserves_order_and_empty_sections(self):
        merged = transcricao.merge_summaries([
            {"visao_geral": "Introdução ao tema apresentado na aula.", "ideias_centrais": ["A primeira ideia explica o conceito principal.", "A atmosfera retém parte do calor terrestre."], "conceitos_definicoes": {"Retenção térmica": "A atmosfera retém parte do calor terrestre."}},
            {"visao_geral": "Outra visão apresentada na aula.", "ideias_centrais": ["A segunda ideia apresenta uma consequência relevante."], "exemplos_apresentados": []},
        ])
        self.assertEqual(merged["overview"], "Introdução ao tema apresentado na aula.")
        self.assertEqual([entry["text"] for entry in merged["main_ideas"]], ["A primeira ideia explica o conceito principal.", "A segunda ideia apresenta uma consequência relevante."])
        self.assertEqual([entry["text"] for entry in merged["concepts"]], ["A atmosfera retém parte do calor terrestre."])
        self.assertEqual(merged["examples"], [])

    def test_normalize_summary_tolerates_incomplete_or_unexpected_content(self):
        self.assertEqual(transcricao.normalize_summary(None)["main_ideas"], [])
        self.assertEqual(transcricao.normalize_summary("A resposta simples decorre do conteúdo transcrito.")["overview"], "A resposta simples decorre do conteúdo transcrito.")

    @staticmethod
    def fake_client(content=None, error=None, observed=None):
        def create(**_kwargs):
            if error:
                raise error
            if observed is not None:
                observed.append(_kwargs)
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])
        return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))

    def test_long_network_transcript_generates_explanatory_summary(self):
        transcript = ("Redes de computadores conectam dispositivos para trocar dados. "
            "Uma LAN cobre uma área local, enquanto uma WAN conecta redes em regiões maiores. "
            "Os protocolos TCP/IP definem como os dados são divididos, endereçados e encaminhados. "
            "Cada dispositivo usa um endereço IP para ser identificado na rede. "
            "Roteadores encaminham pacotes entre redes diferentes, enquanto switches direcionam quadros "
            "aos dispositivos conectados na mesma rede local. A segurança de redes envolve controles "
            "que reduzem acessos não autorizados e protegem a comunicação.")
        response = '{"resumo":{"visao_geral":"A aula explica como redes conectam dispositivos e encaminham dados com protocolos e equipamentos.","ideias_centrais":[{"title":"Encaminhamento de dados","explanation":"Os protocolos TCP/IP organizam os dados em pacotes endereçados, e roteadores encaminham esses pacotes entre redes."}],"conceitos_definicoes":{"LAN":"Rede que conecta dispositivos em uma área local.","WAN":"Rede que conecta redes distribuídas por regiões maiores."},"relacoes_entre_ideias":[{"title":"Roteadores e redes","explanation":"Como conectam redes diferentes, os roteadores encaminham pacotes entre elas."}],"exemplos_apresentados":[{"title":"Rede local","description":"Uma rede local conecta os dispositivos de uma sala para compartilhar dados."}],"perguntas_respostas":[{"question":"O que identifica um dispositivo?","answer":"O endereço IP identifica cada dispositivo na rede."}]}}'
        requests = []
        returned = transcricao.generate_study_material(transcript, client=self.fake_client(response, observed=requests))
        self.assertEqual(returned[0], transcript)
        self.assertEqual(returned[2], "GENERATED")
        summary = transcricao.json.loads(returned[1])
        self.assertIn("encaminham", summary["main_ideas"][0]["text"])
        self.assertEqual(len(summary["concepts"]), 2)
        self.assertEqual(len(summary["relations"]), 1)
        self.assertEqual(len(summary["examples"]), 1)
        self.assertEqual(len(summary["questions"]), 1)
        self.assertTrue(summary["questions"][0]["title"].startswith("O que "))
        self.assertTrue(summary["questions"][0]["title"].endswith("?"))
        self.assertIn(transcript, requests[0]["messages"][1]["content"])
        self.assertIn("Não transforme afirmações em perguntas", requests[0]["messages"][0]["content"])

    def test_accepts_camel_case_and_english_section_aliases(self):
        material = transcricao.normalize_summary({
            "mainIdeas": [{"title": "SQL", "description": "Structured Query Language permite consultar e manipular dados relacionais."}],
            "conceptsAndDefinitions": [{"name": "Chave primária", "content": "Identifica exclusivamente cada registro armazenado em uma tabela."}],
            "relationsBetweenConcepts": [{"title": "Chave estrangeira e relacionamento", "text": "A chave estrangeira referencia o registro relacionado em outra tabela."}],
        })
        self.assertEqual(len(material["main_ideas"]), 1)
        self.assertEqual(len(material["concepts"]), 1)
        self.assertEqual(len(material["relations"]), 1)

    def test_empty_or_short_transcript_is_reported_as_insufficient(self):
        for transcript in ("", "A rede conecta computadores."):
            with self.subTest(transcript=transcript):
                result = transcricao.generate_study_material(transcript, client=self.fake_client())
                self.assertEqual(result[2], "INSUFFICIENT")
                self.assertIn("curta", result[1])

    def test_provider_failure_preserves_transcript_and_returns_safe_error(self):
        transcript = "A aula descreve conceitos de redes e explica como equipamentos encaminham dados entre computadores conectados. " * 4
        result = transcricao.generate_study_material(transcript, client=self.fake_client(error=RuntimeError("secret-key-do-not-leak")))
        self.assertEqual(result[0], transcript.strip())
        self.assertEqual(result[1], "")
        self.assertEqual(result[2], "FAILED")
        self.assertNotIn("secret-key", result[3])

    def test_malformed_or_empty_ai_response_is_failure(self):
        transcript = "A aula descreve conceitos de redes e explica como equipamentos encaminham dados entre computadores conectados. " * 4
        for content in (
            "resposta malformada",
            '{"resumo":{"ideias_centrais":[]}}',
            '{"resumo":{"visao_geral":"A aula apresenta bancos de dados e sua organização."}}',
        ):
            with self.subTest(content=content):
                result = transcricao.generate_study_material(transcript, client=self.fake_client(content))
                self.assertEqual(result[0], transcript.strip())
                self.assertEqual(result[2], "FAILED")
                self.assertEqual(result[1], "")

    def test_long_transcript_is_not_completed_with_generic_insufficient_placeholder(self):
        transcript = "Redes de computadores conectam dispositivos e roteadores encaminham dados entre redes. " * 8
        response = '{"resumo":{"visao_geral":"Conteúdo insuficiente para resumo","ideias_centrais":[],"conceitos_definicoes":[]}}'
        result = transcricao.generate_study_material(transcript, client=self.fake_client(response))
        self.assertEqual(result[2], "FAILED")
        self.assertEqual(result[1], "")
        self.assertIn("Não foi possível gerar", result[3])

    def test_retry_generates_from_existing_transcript_without_whisper(self):
        transcript = "Uma rede local conecta dispositivos e switches encaminham quadros dentro da mesma rede. " * 4
        response = '{"resumo":{"visao_geral":"A aula apresenta o funcionamento de uma rede local.","ideias_centrais":[{"title":"Switches","explanation":"Switches encaminham quadros aos dispositivos conectados na mesma rede local."}]}}'
        result = transcricao.generate_study_material(transcript, client=self.fake_client(response))
        self.assertEqual(result[0], transcript.strip())
        self.assertEqual(result[2], "GENERATED")
        self.assertIn("Switches", result[1])

    def test_cli_summary_retry_reads_saved_transcript_from_stdin(self):
        transcript = "Transcrição existente com explicações de redes, endereços e encaminhamento de pacotes entre dispositivos diferentes."
        stdout = io.StringIO()
        with patch.object(sys, "argv", ["transcricao.py", "--summarize-stdin"]), \
                patch.object(sys, "stdin", io.StringIO(transcript)), \
                patch.object(sys, "stdout", stdout), \
                patch.object(transcricao, "generate_study_material", return_value=(transcript, '{"overview":"A aula explica redes e encaminhamento de pacotes entre dispositivos."}', "GENERATED", None)) as generate:
            self.assertEqual(transcricao.main(), 0)
        generate.assert_called_once_with(transcript)
        self.assertIn(transcricao.STATUS_PREFIX + "GENERATED", stdout.getvalue())
        self.assertIn(transcricao.TRANSCRICAO_PREFIX, stdout.getvalue())

    def test_split_text_cobre_texto_longo_em_ordem(self):
        source = " " .join(["conceito" + str(index) + "." for index in range(2500)])
        chunks = transcricao.split_text(source, max_chars=300)
        self.assertTrue(all(len(chunk) <= 300 for chunk in chunks))
        self.assertEqual(" ".join(chunks), source)

    def test_process_audio_rejeita_arquivo_ausente(self):
        with self.assertRaises(FileNotFoundError):
            transcricao.process_audio(Path("arquivo-ausente-classwatch.wav"))

    def test_whisper_receives_database_vocabulary_without_post_editing_transcript(self):
        transcript = "A aula explica como consultar informações e usar comandos SQL em bancos de dados. " * 2
        observed = {}
        def fake_transcribe(_audio, **options):
            observed.update(options)
            return {"text": transcript}
        fake_whisper = SimpleNamespace(load_model=lambda _name: SimpleNamespace(transcribe=fake_transcribe))
        with tempfile.NamedTemporaryFile() as audio, patch.dict("os.environ", {"OPENAI_API_KEY": ""}), \
                patch.dict(sys.modules, {"torch": SimpleNamespace(cuda=SimpleNamespace(is_available=lambda: False)), "whisper": fake_whisper}), \
                patch.object(transcricao.shutil, "which", return_value="ffmpeg"):
            audio.write(b"audio")
            audio.flush()
            result = transcricao.process_audio(Path(audio.name))
        self.assertEqual(result[0], " ".join(transcript.split()))
        self.assertIn("Structured Query Language", observed["initial_prompt"])
        self.assertIn("NOT NULL", observed["initial_prompt"])


if __name__ == "__main__":
    unittest.main()
