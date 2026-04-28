package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;

/*
 * Camada de regra de negócio
 * Aqui acontece:
 * - transcrição
 * - manipulação de dados
 * - persistência via repository
 */
@Service
public class LectureService {

    private final LectureRepository repository;
    private final TranscriptionService transcriptionService;

    public LectureService(LectureRepository repository,
                          TranscriptionService transcriptionService) {
        this.repository = repository;
        this.transcriptionService = transcriptionService;
    }

    /*
     * Executa o script Python que usa Whisper
     * Recebe o caminho do áudio e retorna o texto transcrito
     */
    private String transcreverAudio(String caminhoAudio) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                    "C:\\Users\\Usuario\\AppData\\Local\\Programs\\Python\\Python313\\python.exe",
                    "C:\\Users\\Usuario\\Documents\\Projetos\\classwatch\\ai\\transcricao.py",
                    caminhoAudio
            );

            /*
             * NÃO mistura stdout com stderr
             * Isso evita lixo (warnings) na transcrição
             */
            processBuilder.redirectErrorStream(false);

            Process process = processBuilder.start();

            /*
             * Lê a saída normal (transcrição)
             */
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8)
            );

            /*
             * Lê erros (warnings do Whisper, etc)
             * Aqui estamos ignorando
             */
            BufferedReader errorReader = new BufferedReader(
                    new InputStreamReader(process.getErrorStream(), StandardCharsets.UTF_8)
            );

            while (errorReader.readLine() != null) {
                // ignorando warnings
            }

            StringBuilder output = new StringBuilder();
            String linha;

            /*
             * Lê a transcrição linha por linha
             */
            while ((linha = reader.readLine()) != null) {
                output.append(linha).append("\n");
            }

            /*
             * Espera o processo Python terminar
             */
            process.waitFor();

            return output.toString().trim();

        } catch (Exception e) {
            e.printStackTrace();
            return "Erro na transcrição";
        }
    }

    /*
     * Cria uma nova lecture
     */
    public Lecture salvar(Lecture lecture) {

        // 1. Define status inicial
        lecture.setStatus("PROCESSANDO");

        // 2. Salva no banco
        Lecture salva = repository.save(lecture);

        // 3. Dispara processamento em background (vamos criar no próximo passo)
        transcriptionService.processar(salva);

        // 4. Retorna imediatamente
        return salva;
    }

    /*
     * Lista todas as lectures
     */
    public List<Lecture> listar() {
        return repository.findAll();
    }

    /*
     * Atualiza uma lecture existente
     */
    public Lecture atualizar(Long id, Lecture novaLecture) {

        Lecture lectureExistente = repository.findById(id).orElse(null);

        /*
         * Se não existir, retorna null (melhorar depois)
         */
        if (lectureExistente == null) {
            return null;
        }

        /*
         * Atualiza os campos
         */
        lectureExistente.setTitulo(novaLecture.getTitulo());
        lectureExistente.setDescricao(novaLecture.getDescricao());
        lectureExistente.setAudioPath(novaLecture.getAudioPath());
        lectureExistente.setTranscricao(novaLecture.getTranscricao());
        lectureExistente.setResumo(novaLecture.getResumo());

        return repository.save(lectureExistente);
    }
}