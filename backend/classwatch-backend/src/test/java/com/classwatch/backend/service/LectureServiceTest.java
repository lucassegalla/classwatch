package com.classwatch.backend.service;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.LectureDetailResponse;
import com.classwatch.backend.exception.BadRequestException;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.nio.file.Path;
import java.nio.file.Files;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.junit.jupiter.api.Assertions.*;
class LectureServiceTest {
    private static class RecordingTranscriptionService extends TranscriptionService {
        Long summarizedId;
        Long transcribedId;
        RecordingTranscriptionService() { super(null, null, "python", "", 60, "", "small", ""); }
        @Override public void agendarResumo(Long id) { summarizedId = id; }
        @Override public void agendar(Long id) { transcribedId = id; }
    }

    @TempDir
    Path temporaryDirectory;

    @Test
    void rejeitaArquivoVazio() {
        var service = new LectureService(null, null, temporaryDirectory.toString());
        var file = new MockMultipartFile("file", "aula.mp3", "audio/mpeg", new byte[0]);
        assertThrows(BadRequestException.class, () -> service.salvarComArquivo(file, "Aula", ""));
    }

    @Test
    void rejeitaExtensaoNaoSuportada() {
        var service = new LectureService(null, null, temporaryDirectory.toString());
        var file = new MockMultipartFile("file", "aula.exe", "audio/mpeg", new byte[]{1});
        assertThrows(BadRequestException.class, () -> service.salvarComArquivo(file, "Aula", ""));
    }

    @Test
    void dtoDeHistoricoNaoIncluiTextosLongos() {
        var lecture = new Lecture();
        lecture.setTitulo("Aula");
        lecture.setTranscricao("transcrição longa");
        lecture.setResumo("resumo longo");
        lecture.setStatus(LectureStatus.PROCESSANDO);
        var response = LectureResponse.from(lecture);
        var components = java.util.Arrays.stream(LectureResponse.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName).toList();
        assertFalse(components.contains("transcricao"));
        assertFalse(components.contains("resumo"));
        assertEquals("Aula", response.titulo());
    }

    @Test
    void dtoDeDetalhePreservaResumoEstruturadoETranscricao() {
        var lecture = new Lecture();
        var summary = "{\"overview\":\"A aula explica como roteadores encaminham pacotes entre redes.\",\"main_ideas\":[{\"title\":\"Roteamento\",\"text\":\"Roteadores encaminham pacotes usando endereços IP.\"}]}";
        var transcript = "Redes conectam computadores e roteadores encaminham pacotes entre redes diferentes.";
        lecture.setResumo(summary);
        lecture.setTranscricao(transcript);
        var response = LectureDetailResponse.from(lecture);
        assertEquals(summary, response.resumo());
        assertEquals(transcript, response.transcricao());
    }

    @Test
    void retryUsesPersistedTranscriptWithoutNeedingOriginalAudio() {
        var lecture = new Lecture();
        lecture.setId(42L);
        lecture.setStatus(LectureStatus.ERRO);
        lecture.setAudioPath(temporaryDirectory.resolve("removed-audio.mp3").toString());
        lecture.setTranscricao("Transcrição extensa de redes já salva e suficiente para gerar material de estudo.");
        var transcriptionService = new RecordingTranscriptionService();
        var service = new LectureService(repositoryFor(lecture), transcriptionService, temporaryDirectory.toString());
        TransactionSynchronizationManager.initSynchronization();
        try {
            var updated = service.retry(42L);
            assertEquals(LectureStatus.PROCESSANDO, updated.getStatus());
            assertEquals(lecture.getTranscricao(), updated.getTranscricao());
            TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
            assertEquals(42L, transcriptionService.summarizedId);
            assertNull(transcriptionService.transcribedId);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void retryRecoversCompletedLectureWithOverviewButNoDetailedSections() {
        var lecture = new Lecture();
        lecture.setId(7L);
        lecture.setStatus(LectureStatus.FINALIZADO);
        lecture.setAudioPath(temporaryDirectory.resolve("removed-audio.mp3").toString());
        lecture.setTranscricao("Redes de computadores conectam dispositivos e roteadores encaminham dados. ".repeat(8));
        lecture.setResumo("{\"overview\":\"A aula apresenta conceitos de redes e bancos de dados.\",\"main_ideas\":[],\"concepts\":[],\"relations\":[]}");
        var transcriptionService = new RecordingTranscriptionService();
        var service = new LectureService(repositoryFor(lecture), transcriptionService, temporaryDirectory.toString());
        TransactionSynchronizationManager.initSynchronization();
        try {
            assertEquals(LectureStatus.PROCESSANDO, service.retry(7L).getStatus());
            TransactionSynchronizationManager.getSynchronizations().forEach(TransactionSynchronization::afterCommit);
            assertEquals(7L, transcriptionService.summarizedId);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    void completedLectureWithDetailedSummaryCannotBeQueuedAgain() {
        var lecture = new Lecture();
        lecture.setId(8L);
        lecture.setStatus(LectureStatus.FINALIZADO);
        lecture.setTranscricao("Uma transcrição extensa sobre relacionamentos e tabelas. ".repeat(8));
        lecture.setResumo("{\"overview\":\"Aula de bancos relacionais.\",\"concepts\":[{\"title\":\"Chave primária\",\"text\":\"Identifica exclusivamente cada registro da tabela.\"}]}");
        var service = new LectureService(repositoryFor(lecture), new RecordingTranscriptionService(), temporaryDirectory.toString());
        assertThrows(BadRequestException.class, () -> service.retry(8L));
    }

    @Test
    void workerOutputIsPersistedAndReturnedInLectureDetail() throws Exception {
        var lecture = new Lecture();
        lecture.setId(13L);
        lecture.setStatus(LectureStatus.PROCESSANDO);
        var audio = temporaryDirectory.resolve("audio.mp3");
        Files.write(audio, new byte[]{1, 2, 3});
        lecture.setAudioPath(audio.toString());
        var transcript = "Roteadores encaminham pacotes entre redes diferentes usando endereços IP.";
        var summary = "{\"overview\":\"A aula explica como roteadores conectam redes diferentes.\",\"main_ideas\":[{\"title\":\"Roteamento\",\"text\":\"Roteadores encaminham pacotes usando endereços IP.\"}]}";
        var script = temporaryDirectory.resolve("worker.py");
        Files.writeString(script, "print('CLASSWATCH_TRANSCRICAO:" + Base64.getEncoder().encodeToString(transcript.getBytes(StandardCharsets.UTF_8)) + "')\n"
                + "print('CLASSWATCH_RESUMO:" + Base64.getEncoder().encodeToString(summary.getBytes(StandardCharsets.UTF_8)) + "')\n"
                + "print('CLASSWATCH_STATUS:GENERATED')\n", StandardCharsets.UTF_8);
        var repository = repositoryFor(lecture);
        var transcription = new TranscriptionService(repository, null, "python", script.toString(), 15, "", "small", "model");
        var process = TranscriptionService.class.getDeclaredMethod("processar", Long.class);
        process.setAccessible(true);
        process.invoke(transcription, 13L);
        assertEquals(LectureStatus.FINALIZADO, lecture.getStatus());
        assertEquals(transcript, lecture.getTranscricao());
        var detail = LectureDetailResponse.from(lecture);
        assertEquals(summary, detail.resumo());
        assertEquals(transcript, detail.transcricao());
    }

    @Test
    void failedSummaryRetryKeepsPreviouslySavedSummaryAndTranscript() throws Exception {
        var lecture = new Lecture();
        lecture.setId(14L);
        lecture.setStatus(LectureStatus.PROCESSANDO);
        String savedTranscript = "A aula descreve redes locais e explica como switches encaminham quadros entre dispositivos. ".repeat(4).trim();
        String savedSummary = "{\"overview\":\"A aula explica redes locais e o encaminhamento de quadros.\",\"main_ideas\":[{\"title\":\"Switches\",\"text\":\"Switches encaminham quadros aos dispositivos conectados na mesma rede local.\"}]}";
        lecture.setTranscricao(savedTranscript);
        lecture.setResumo(savedSummary);
        var audio = temporaryDirectory.resolve("retry-audio.mp3");
        Files.write(audio, new byte[]{1, 2, 3});
        lecture.setAudioPath(audio.toString());
        String partialSummary = "{\"overview\":\"Resumo parcial sem seções de estudo.\"}";
        var script = temporaryDirectory.resolve("failed-worker.py");
        Files.writeString(script, "print('CLASSWATCH_TRANSCRICAO:' + " + pythonStringBase64(savedTranscript) + ")\n"
                + "print('CLASSWATCH_RESUMO:' + " + pythonStringBase64(partialSummary) + ")\n"
                + "print('CLASSWATCH_STATUS:FAILED')\n"
                + "print('CLASSWATCH_ERROR:' + " + pythonStringBase64("Resumo não gerado") + ")\n", StandardCharsets.UTF_8);

        var repository = repositoryFor(lecture);
        var transcription = new TranscriptionService(repository, null, "python", script.toString(), 15, "", "small", "model");
        var process = TranscriptionService.class.getDeclaredMethod("processar", Long.class);
        process.setAccessible(true);
        process.invoke(transcription, 14L);

        assertEquals(LectureStatus.ERRO, lecture.getStatus());
        assertEquals(savedTranscript, lecture.getTranscricao());
        assertEquals(savedSummary, lecture.getResumo());
        assertEquals("Resumo não gerado", lecture.getErroProcessamento());
    }

    @Test
    void explicitGeneratedStatusWithNoStudySectionsDoesNotReplaceSavedSummary() throws Exception {
        var lecture = new Lecture();
        lecture.setId(15L);
        lecture.setStatus(LectureStatus.PROCESSANDO);
        String savedSummary = "{\"overview\":\"A aula explica redes locais e o encaminhamento de quadros.\",\"main_ideas\":[{\"title\":\"Switches\",\"text\":\"Switches encaminham quadros aos dispositivos conectados na mesma rede local.\"}]}";
        lecture.setResumo(savedSummary);
        lecture.setTranscricao("Transcrição salva sobre redes locais, switches e encaminhamento de quadros. ".repeat(4));
        var audio = temporaryDirectory.resolve("invalid-retry-audio.mp3");
        Files.write(audio, new byte[]{1, 2, 3});
        lecture.setAudioPath(audio.toString());
        String malformedSummary = "{\"overview\":\"Resumo incompleto sem explicações estruturadas suficientes.\"}";
        var script = temporaryDirectory.resolve("invalid-worker.py");
        Files.writeString(script, "print('CLASSWATCH_TRANSCRICAO:')\n"
                + "print('CLASSWATCH_RESUMO:' + " + pythonStringBase64(malformedSummary) + ")\n"
                + "print('CLASSWATCH_STATUS:GENERATED')\n", StandardCharsets.UTF_8);

        var transcription = new TranscriptionService(repositoryFor(lecture), null, "python", script.toString(), 15, "", "small", "model");
        var process = TranscriptionService.class.getDeclaredMethod("processar", Long.class);
        process.setAccessible(true);
        process.invoke(transcription, 15L);

        assertEquals(LectureStatus.ERRO, lecture.getStatus());
        assertEquals(savedSummary, lecture.getResumo());
        assertNotNull(lecture.getErroProcessamento());
    }

    @Test
    void insufficientRetryKeepsAnExistingValidSummary() throws Exception {
        var lecture = new Lecture();
        lecture.setId(16L);
        lecture.setStatus(LectureStatus.PROCESSANDO);
        String savedSummary = "{\"overview\":\"A aula explica redes locais e o encaminhamento de quadros.\",\"main_ideas\":[{\"title\":\"Switches\",\"text\":\"Switches encaminham quadros aos dispositivos conectados na mesma rede local.\"}]}";
        lecture.setResumo(savedSummary);
        lecture.setTranscricao("Transcrição salva sobre redes locais, switches e encaminhamento de quadros. ".repeat(4));
        var audio = temporaryDirectory.resolve("insufficient-retry-audio.mp3");
        Files.write(audio, new byte[]{1, 2, 3});
        lecture.setAudioPath(audio.toString());
        String insufficientSummary = "{\"overview\":\"A transcrição é curta demais.\",\"main_ideas\":[],\"concepts\":[],\"relations\":[]}";
        var script = temporaryDirectory.resolve("insufficient-worker.py");
        Files.writeString(script, "print('CLASSWATCH_TRANSCRICAO:')\n"
                + "print('CLASSWATCH_RESUMO:' + " + pythonStringBase64(insufficientSummary) + ")\n"
                + "print('CLASSWATCH_STATUS:INSUFFICIENT')\n", StandardCharsets.UTF_8);

        var transcription = new TranscriptionService(repositoryFor(lecture), null, "python", script.toString(), 15, "", "small", "model");
        var process = TranscriptionService.class.getDeclaredMethod("processar", Long.class);
        process.setAccessible(true);
        process.invoke(transcription, 16L);

        assertEquals(LectureStatus.FINALIZADO, lecture.getStatus());
        assertEquals(savedSummary, lecture.getResumo());
        assertNull(lecture.getErroProcessamento());
    }

    private String pythonStringBase64(String value) {
        return "'" + Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8)) + "'";
    }

    private LectureRepository repositoryFor(Lecture lecture) {
        return (LectureRepository) Proxy.newProxyInstance(LectureRepository.class.getClassLoader(), new Class<?>[]{LectureRepository.class}, (proxy, method, args) -> switch (method.getName()) {
            case "findById" -> java.util.Optional.of(lecture);
            case "save" -> args[0];
            case "toString" -> "LectureRepository test proxy";
            default -> null;
        });
    }

}
