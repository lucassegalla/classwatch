package com.classwatch.backend.service;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

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
    private static final String STATUS_PREFIX = "CLASSWATCH_STATUS:";
    private static final String ERROR_PREFIX = "CLASSWATCH_ERROR:";

    private final LectureRepository repository;
    private final ThreadPoolTaskExecutor transcriptionExecutor;
    private final String pythonPath;
    private final String configuredScriptPath;
    private final long timeoutSeconds;
    private final String openAiApiKey;
    private final String whisperModel;
    private final String openAiModel;

    public TranscriptionService(
            LectureRepository repository,
            @org.springframework.beans.factory.annotation.Qualifier("transcriptionExecutor") ThreadPoolTaskExecutor transcriptionExecutor,
            @Value("${classwatch.python.path:python}") String pythonPath,
            @Value("${classwatch.ai.script-path:}") String configuredScriptPath,
            @Value("${classwatch.ai.timeout-seconds:1800}") long timeoutSeconds,
            @Value("${classwatch.ai.openai-api-key:}") String openAiApiKey,
            @Value("${classwatch.ai.whisper-model:small}") String whisperModel,
            @Value("${classwatch.ai.openai-model:gpt-4o-mini}") String openAiModel
    ) {
        this.repository = repository;
        this.transcriptionExecutor = transcriptionExecutor;
        this.pythonPath = pythonPath;
        this.configuredScriptPath = configuredScriptPath;
        this.timeoutSeconds = timeoutSeconds;
        this.openAiApiKey = openAiApiKey;
        this.whisperModel = whisperModel;
        this.openAiModel = openAiModel;
    }

    private void processar(Long lectureId) {
        processar(lectureId, false);
    }

    private void processar(Long lectureId, boolean summarizeExistingTranscript) {
        Lecture lecture = repository.findById(lectureId).orElse(null);

        if (lecture == null) {
            return;
        }

        try {
            Path scriptPath = resolveScriptPath();
            ProcessBuilder processBuilder;
            if (summarizeExistingTranscript) {
                processBuilder = new ProcessBuilder(pythonPath, scriptPath.toString(), "--summarize-stdin");
            } else {
                Path audioPath = Path.of(lecture.getAudioPath()).toAbsolutePath().normalize();
                if (!Files.exists(audioPath)) {
                    throw new ProcessingException("Arquivo de áudio não encontrado para processamento");
                }
                processBuilder = new ProcessBuilder(pythonPath, scriptPath.toString(), audioPath.toString());
            }

            processBuilder.redirectErrorStream(true);
            processBuilder.environment().put("WHISPER_MODEL", whisperModel);
            processBuilder.environment().put("OPENAI_MODEL", openAiModel);

            if (openAiApiKey != null && !openAiApiKey.isBlank()) {
                processBuilder.environment().put("OPENAI_API_KEY", openAiApiKey);
            }

            log.info("Iniciando processamento da aula {}", lectureId);

            Process process = processBuilder.start();

            if (summarizeExistingTranscript) {
                try (var input = process.getOutputStream()) {
                    input.write((lecture.getTranscricao() == null ? "" : lecture.getTranscricao()).getBytes(StandardCharsets.UTF_8));
                }
            }

            CompletableFuture<String> outputFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                } catch (IOException exception) {
                    throw new RuntimeException(exception);
                }
            });

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.descendants().forEach(ProcessHandle::destroyForcibly);
                process.destroyForcibly();
                throw new ProcessingException("O processamento excedeu o tempo máximo permitido");
            }

            String output = outputFuture.get(10, TimeUnit.SECONDS).trim();

            if (process.exitValue() != 0) {
                log.warn("Processador da aula {} retornou código {}", lectureId, process.exitValue());
                throw new ProcessingException("A transcrição ou geração de material falhou. Verifique as dependências e tente novamente.");
            }

            String transcricao = decodeResult(output, TRANSCRICAO_PREFIX);
            String resumo = decodeOptionalResult(output, RESUMO_PREFIX);
            String statusLine = output.lines().filter(line -> line.startsWith(STATUS_PREFIX))
                    .map(line -> line.substring(STATUS_PREFIX.length()).trim()).findFirst().orElse(null);
            String status = statusLine == null ? "GENERATED" : statusLine;

            // Older Python workers did not emit a status. A non-empty legacy summary
            // remains valid and is kept compatible; new workers report failures explicitly.
            if (!transcricao.isBlank()) lecture.setTranscricao(transcricao);
            boolean invalidGeneratedSummary = statusLine != null && "GENERATED".equals(status)
                    && !StudySummaryValidator.hasStudySections(resumo);
            if ("FAILED".equals(status) || resumo == null || resumo.isBlank() || invalidGeneratedSummary) {
                lecture.setStatus(LectureStatus.ERRO);
                lecture.setErroProcessamento(decodeOptionalResult(output, ERROR_PREFIX));
                if (lecture.getErroProcessamento() == null || lecture.getErroProcessamento().isBlank()) {
                    lecture.setErroProcessamento("Não foi possível gerar um resumo válido. A transcrição foi preservada; tente novamente.");
                }
                repository.save(lecture);
                log.warn("Resumo da aula {} não foi gerado; transcrição preservada", lectureId);
                return;
            }
            if (!"GENERATED".equals(status) && !"INSUFFICIENT".equals(status)) {
                throw new ProcessingException("O processador retornou um estado de resumo inválido");
            }

            if ("INSUFFICIENT".equals(status) && StudySummaryValidator.hasStudySections(lecture.getResumo())) {
                lecture.setStatus(LectureStatus.FINALIZADO);
                lecture.setErroProcessamento(null);
                repository.save(lecture);
                log.info("Resumo anterior válido da aula {} foi preservado", lectureId);
                return;
            }

            lecture.setResumo(resumo);
            lecture.setStatus(LectureStatus.FINALIZADO);
            lecture.setErroProcessamento(null);
            repository.save(lecture);
            log.info("Processamento da aula {} finalizado", lectureId);
        } catch (Exception exception) {
            log.error("Falha ao processar aula {} ({})", lectureId, exception.getClass().getSimpleName());

            lecture.setStatus(LectureStatus.ERRO);
            lecture.setErroProcessamento(toUserMessage(exception));
            repository.save(lecture);
        }
    }

    public void agendar(Long lectureId) {
        agendar(lectureId, false);
    }

    public void agendarResumo(Long lectureId) {
        agendar(lectureId, true);
    }

    private void agendar(Long lectureId, boolean summarizeExistingTranscript) {
        try {
            transcriptionExecutor.execute(() -> processar(lectureId, summarizeExistingTranscript));
        } catch (java.util.concurrent.RejectedExecutionException exception) {
            repository.findById(lectureId).ifPresent(lecture -> {
                lecture.setStatus(LectureStatus.ERRO);
                lecture.setErroProcessamento("A fila de processamento está cheia. Tente novamente mais tarde.");
                repository.save(lecture);
            });
            log.warn("Fila cheia; aula {} não foi agendada", lectureId);
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
        String decoded = decodeOptionalResult(output, prefix);
        if (decoded == null) throw new ProcessingException("Resposta inválida do processador Python");
        return decoded;
    }

    private String decodeOptionalResult(String output, String prefix) {
        String encoded = output.lines()
                .filter(line -> line.startsWith(prefix))
                .map(line -> line.substring(prefix.length()).trim())
                .reduce((first, second) -> second)
                .orElse(null);
        if (encoded == null) return null;

        try {
            return new String(Base64.getDecoder().decode(encoded), StandardCharsets.UTF_8).trim();
        } catch (IllegalArgumentException exception) {
            throw new ProcessingException("Não foi possível interpretar a resposta do processador Python");
        }
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
