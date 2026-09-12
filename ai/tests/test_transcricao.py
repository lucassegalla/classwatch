import unittest

from transcricao import normalizar_texto, validar_resultado


class TranscricaoTest(unittest.TestCase):

    def test_normaliza_espacos_sem_mudar_conteudo(self):
        self.assertEqual(
            normalizar_texto("  Uma   aula\ncom conteúdo. "),
            "Uma aula com conteúdo.",
        )

    def test_valida_resultado_estruturado(self):
        result = validar_resultado(
            {"transcricao": " Texto revisado. ", "resumo": " - ponto "}
        )

        self.assertEqual(result["transcricao"], "Texto revisado.")
        self.assertEqual(result["resumo"], "- ponto")

    def test_rejeita_transcricao_vazia(self):
        with self.assertRaises(ValueError):
            validar_resultado({"transcricao": "", "resumo": "- ponto"})


if __name__ == "__main__":
    unittest.main()
