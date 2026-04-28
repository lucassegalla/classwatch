package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

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
     * Método assíncrono (roda em background)
     */
    @Async
    public void processar(Lecture lecture) {

        try {

            /*
             * Executa o Python (mesma lógica que você já tinha)
             */
            ProcessBuilder processBuilder = new ProcessBuilder(
                    pythonPath,
                    scriptPath,
                    lecture.getAudioPath()
            );

            processBuilder.redirectErrorStream(false);
            Process process = processBuilder.start();

            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8)
            );

            BufferedReader errorReader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8)
            );

            while (errorReader.readLine() != null) {
                // ignora warnings
            }

            StringBuilder output = new StringBuilder();
            String linha;

            while ((linha = reader.readLine()) != null) {
                output.append(linha).append("\n");
            }

            process.waitFor();

            /*
             * Atualiza a lecture
             */
            String resultado = output.toString();

            String transcricao = "";
            String resumo = "";

            if (resultado.contains("###TRANSCRICAO###") && resultado.contains("###RESUMO###")) {

                String[] partes = resultado.split("###TRANSCRICAO###");
                if (partes.length > 1) {
                    String[] subPartes = partes[1].split("###RESUMO###");

                    transcricao = subPartes[0].trim();

                    if (subPartes.length > 1) {
                        resumo = subPartes[1].trim();
                    }
                }
            }

            lecture.setTranscricao(transcricao);
            lecture.setResumo(resumo);
            lecture.setStatus("FINALIZADO");

            repository.save(lecture);

            lecture.setStatus("FINALIZADO");

            repository.save(lecture);

        } catch (Exception e) {
            e.printStackTrace();

            lecture.setStatus("ERRO");
            repository.save(lecture);
        }
    }
}