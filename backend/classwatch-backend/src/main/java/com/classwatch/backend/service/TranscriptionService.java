package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Service
public class TranscriptionService {

    private static final Logger log = LoggerFactory.getLogger(TranscriptionService.class);
    private static final String TRANSCRICAO_PREFIX = "CLASSWATCH_TRANSCRICAO:";
    private static final String RESUMO_PREFIX = "CLASSWATCH_RESUMO:";

    private final LectureRepository repository;
    private final String pythonPath;
    private final String configuredScriptPath;
    private final long timeoutSeconds;
    private final String openAiApiKey;
    private final String whisperModel;
    private final String openAiModel;

    public TranscriptionService(
            LectureRepository repository,
            @Value("${classwatch.python.path:python}") String pythonPath,
            @Value("${classwatch.ai.script-path:}") String configuredScriptPath,
            @Value("${classwatch.ai.timeout-seconds:1800}") long timeoutSeconds,
            @Value("${classwatch.ai.openai-api-key:}") String openAiApiKey,
            @Value("${classwatch.ai.whisper-model:small}") String whisperModel,
            @Value("${classwatch.ai.openai-model:gpt-4o-mini}") String openAiModel
    ) {
        this.repository = repository;
        this.pythonPath = pythonPath;
        this.configuredScriptPath = configuredScriptPath;
        this.timeoutSeconds = timeoutSeconds;
        this.openAiApiKey = openAiApiKey;
        this.whisperModel = whisperModel;
        this.openAiModel = openAiModel;
    }

    @Async("transcriptionExecutor")
    public void processar(Long lectureId) {
        Lecture lecture = repository.findById(lectureId).orElse(null);

        if (lecture == null) {
            return;
        }

        try {
            Path audioPath = Path.of(lecture.getAudioPath()).toAbsolutePath().normalize();
            if (!Files.exists(audioPath)) {
                throw new ProcessingException("Arquivo de áudio não encontrado para processamento");
            }

            Path scriptPath = resolveScriptPath();

            ProcessBuilder processBuilder = new ProcessBuilder(
                    pythonPath,
                    scriptPath.toString(),
                    audioPath.toString()
            );

            processBuilder.redirectErrorStream(true);
            processBuilder.environment().put("WHISPER_MODEL", whisperModel);
            processBuilder.environment().put("OPENAI_MODEL", openAiModel);

            if (openAiApiKey != null && !openAiApiKey.isBlank()) {
                processBuilder.environment().put("OPENAI_API_KEY", openAiApiKey);
            }

            log.info("Iniciando processamento da aula {}", lectureId);

            Process process = processBuilder.start();

            CompletableFuture<String> outputFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                } catch (IOException exception) {
                    throw new RuntimeException(exception);
                }
            });

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                throw new ProcessingException("O processamento excedeu o tempo máximo permitido");
            }

            String output = outputFuture.get(10, TimeUnit.SECONDS).trim();

            if (process.exitValue() != 0) {
                throw new ProcessingException(extractUsefulError(output));
            }

            String transcricao = decodeResult(output, TRANSCRICAO_PREFIX);
            String resumo = decodeResult(output, RESUMO_PREFIX);

            lecture.setTranscricao(transcricao);
            lecture.setResumo(resumo);
            lecture.setStatus(LectureStatus.FINALIZADO);
            lecture.setErroProcessamento(null);
            repository.save(lecture);

            log.info("Processamento da aula {} finalizado", lectureId);
        } catch (Exception exception) {
            log.error("Falha ao processar aula {}: {}", lectureId, exception.getMessage());

            lecture.setStatus(LectureStatus.ERRO);
            lecture.setErroProcessamento(toUserMessage(exception));
            repository.save(lecture);
        }
    }

    private Path resolveScriptPath() {
        if (configuredScriptPath != null && !configuredScriptPath.isBlank()) {
            Path configured = Path.of(configuredScriptPath).toAbsolutePath().normalize();
            if (Files.exists(configured)) {
                return configured;
            }
            throw new ProcessingException("Script Python não encontrado no caminho configurado");
        }

        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        Path[] candidates = new Path[]{
                current.resolve("ai/transcricao.py"),
                current.resolve("../ai/transcricao.py").normalize(),
                current.resolve("../../ai/transcricao.py").normalize()
        };

        for (Path candidate : candidates) {
            if (Files.exists(candidate)) {
                return candidate;
            }
        }

        throw new ProcessingException("Script Python não encontrado. Configure AI_SCRIPT_PATH");
    }

    private String decodeResult(String output, String prefix) {
        String encoded = output.lines()
                .filter(line -> line.startsWith(prefix))
                .map(line -> line.substring(prefix.length()).trim())
                .reduce((first, second) -> second)
                .orElseThrow(() -> new ProcessingException("Resposta inválida do processador Python"));

        try {
            return new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8).trim();
        } catch (IllegalArgumentException exception) {
            throw new ProcessingException("Não foi possível interpretar a resposta do processador Python");
        }
    }

    private String extractUsefulError(String output) {
        if (output == null || output.isBlank()) {
            return "O processador Python foi encerrado com erro";
        }

        String[] lines = output.split("\\R");
        String lastLine = lines[lines.length - 1].trim();

        if (lastLine.length() > 500) {
            lastLine = lastLine.substring(0, 500);
        }

        return "Falha no processamento: " + lastLine;
    }

    private String toUserMessage(Exception exception) {
        if (exception instanceof ProcessingException && exception.getMessage() != null) {
            return exception.getMessage();
        }

        return "Não foi possível processar esta aula. Tente novamente.";
    }

    private static class ProcessingException extends RuntimeException {
        ProcessingException(String message) {
            super(message);
        }
    }
}
