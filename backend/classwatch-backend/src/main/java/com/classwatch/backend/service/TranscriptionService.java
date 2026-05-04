package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

/*
 * Serviço responsável por:
 * - Executar o script Python (Whisper)
 * - Capturar a saída da transcrição
 * - Tratar resposta (com ou sem IA)
 * - Atualizar o banco
 */
@Service
public class TranscriptionService {

    @Value("${python.path}")
    private String pythonPath;

    @Value("${script.path}")
    private String scriptPath;

    private final LectureRepository repository;

    public TranscriptionService(LectureRepository repository) {
        this.repository = repository;
    }

    /*
     * Executa em background (não trava o backend)
     */
    @Async
    public void processar(Lecture lecture) {

        try {

            /*
             * 1. Executa o script Python
             */
            ProcessBuilder processBuilder = new ProcessBuilder(
                    pythonPath,
                    scriptPath,
                    lecture.getAudioPath()
            );

            // NÃO mistura erro com saída normal
            processBuilder.redirectErrorStream(false);

            Process process = processBuilder.start();

            /*
             * 2. Captura saída padrão (transcrição)
             */
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8)
            );

            /*
             * 3. Captura erros (ignorando por enquanto)
             */
            BufferedReader errorReader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8)
            );

            while (errorReader.readLine() != null) {
                // ignorando warnings do Whisper
            }

            /*
             * 4. Lê a saída do Python
             */
            StringBuilder output = new StringBuilder();
            String linha;

            while ((linha = reader.readLine()) != null) {
                output.append(linha).append("\n");
            }

            // espera o processo finalizar
            process.waitFor();

            /*
             * 5. Resultado final do Python
             */
            String resultado = output.toString().trim();

            System.out.println("SAIDA PYTHON:");
            System.out.println(resultado);

            /*
             * 6. Tratamento da resposta
             */
            String transcricao;
            String resumo = "";

            /*
             * Caso 1: resposta formatada (com IA)
             */
            if (resultado.contains("###TRANSCRICAO###") && resultado.contains("###RESUMO###")) {

                String[] partes = resultado.split("###TRANSCRICAO###");

                if (partes.length > 1) {
                    String[] subPartes = partes[1].split("###RESUMO###");

                    transcricao = subPartes[0].trim();

                    if (subPartes.length > 1) {
                        resumo = subPartes[1].trim();
                    }
                } else {
                    // fallback
                    transcricao = resultado;
                }

            } else {

                /*
                 * Caso 2: sem IA (Whisper puro)
                 */
                transcricao = resultado;
            }

            /*
             * 7. Atualiza entidade
             */
            lecture.setTranscricao(transcricao);
            lecture.setResumo(resumo);
            lecture.setStatus("FINALIZADO");

            /*
             * 8. Salva no banco
             */
            repository.save(lecture);

        } catch (Exception e) {
            e.printStackTrace();

            /*
             * Em caso de erro
             */
            lecture.setStatus("ERRO");
            repository.save(lecture);
        }
    }
}