package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class TranscriptionService {

    private final LectureRepository lectureRepository;
    private final AudioStorageService audioStorageService;
    private final ObjectMapper objectMapper;
    private final String pythonExecutable;
    private final String scriptPath;
    private final long timeoutSeconds;

    public TranscriptionService(
            LectureRepository lectureRepository,
            AudioStorageService audioStorageService,
            ObjectMapper objectMapper,
            @Value("${app.transcription.python-executable:python}") String pythonExecutable,
            @Value("${app.transcription.script-path:../../ai/transcricao.py}") String scriptPath,
            @Value("${app.transcription.timeout-seconds:3600}") long timeoutSeconds
    ) {
        this.lectureRepository = lectureRepository;
        this.audioStorageService = audioStorageService;
        this.objectMapper = objectMapper;
        this.pythonExecutable = pythonExecutable;
        this.scriptPath = scriptPath;
        this.timeoutSeconds = timeoutSeconds;
    }

    @Async("transcriptionExecutor")
    public void processar(Long lectureId) {
        try {
            Lecture lecture = buscar(lectureId);
            lecture.setStatus(LectureStatus.PROCESSANDO);
            lecture.setErrorMessage(null);
            lecture.setProcessingStartedAt(Instant.now());
            lectureRepository.save(lecture);

            Process process = new ProcessBuilder(
                    pythonExecutable,
                    scriptPath,
                    audioStorageService.resolver(lecture.getAudioPath()).toString()
            ).start();

            CompletableFuture<String> stdout = lerAsync(process.getInputStream());
            CompletableFuture<String> stderr = lerAsync(process.getErrorStream());

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("O processamento excedeu o tempo limite");
            }

            String output = stdout.join().trim();
            String errorOutput = stderr.join().trim();

            if (process.exitValue() != 0) {
                throw new IllegalStateException(
                        errorOutput.isBlank() ? "O processo Python terminou com erro" : errorOutput
                );
            }

            TranscriptionResult result = objectMapper.readValue(output, TranscriptionResult.class);
            if (result.transcricao() == null || result.transcricao().isBlank()) {
                throw new IllegalStateException("O processamento não retornou uma transcrição");
            }

            Lecture current = buscar(lectureId);
            current.setTranscricao(result.transcricao().trim());
            current.setResumo(result.resumo() == null ? "" : result.resumo().trim());
            current.setStatus(LectureStatus.FINALIZADO);
            current.setProcessingFinishedAt(Instant.now());
            current.setErrorMessage(null);
            lectureRepository.save(current);

            log.info("Aula {} processada com sucesso", lectureId);
        } catch (Exception exception) {
            log.error("Falha ao processar a aula {}", lectureId, exception);
            lectureRepository.findById(lectureId).ifPresent(lecture -> {
                lecture.setStatus(LectureStatus.ERRO);
                lecture.setProcessingFinishedAt(Instant.now());
                lecture.setErrorMessage(resumirErro(exception));
                lectureRepository.save(lecture);
            });
        }
    }

    private Lecture buscar(Long lectureId) {
        return lectureRepository.findById(lectureId)
                .orElseThrow(() -> new IllegalStateException("Aula não encontrada durante o processamento"));
    }

    private CompletableFuture<String> lerAsync(InputStream inputStream) {
        return CompletableFuture.supplyAsync(() -> {
            try (inputStream) {
                return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8);
            } catch (IOException exception) {
                throw new IllegalStateException("Não foi possível ler a saída do processo", exception);
            }
        });
    }

    private String resumirErro(Exception exception) {
        String message = exception.getMessage();
        if (message == null || message.isBlank()) {
            message = exception.getClass().getSimpleName();
        }
        return message.length() > 1000 ? message.substring(0, 1000) : message;
    }

    private record TranscriptionResult(String transcricao, String resumo) {
    }
}
