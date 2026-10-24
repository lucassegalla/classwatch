package com.classwatch.backend.service;

import com.classwatch.backend.exception.BadRequestException;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
public class LectureService {

    private static final Logger log = LoggerFactory.getLogger(LectureService.class);

    private static final Set<String> EXTENSOES_PERMITIDAS = Set.of("m4a", "aac", "mp3", "wav");

    private final LectureRepository repository;
    private final TranscriptionService transcriptionService;
    private final Path uploadDirectory;

    public LectureService(LectureRepository repository,
                          TranscriptionService transcriptionService,
                          @Value("${classwatch.upload.dir:uploads}") String uploadDirectory) {
        this.repository = repository;
        this.transcriptionService = transcriptionService;
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    public Lecture salvarComArquivo(MultipartFile file, String titulo, String descricao) {
        return salvarComArquivo(file, titulo, descricao, null);
    }

    public Lecture salvarComArquivo(MultipartFile file, String titulo, String descricao, String requestId) {
        validarDados(file, titulo, descricao);
        if (requestId != null && !requestId.isBlank()) {
            if (requestId.length() > 64 || !requestId.matches("[A-Za-z0-9-]+")) {
                throw new BadRequestException("Identificador de envio inválido");
            }
            var existing = repository.findByRequestId(requestId);
            if (existing.isPresent()) return existing.get();
        }

        String extensao = obterExtensao(file.getOriginalFilename());
        String nomeArquivo = UUID.randomUUID() + "." + extensao;
        Path destino = uploadDirectory.resolve(nomeArquivo).normalize();

        if (!destino.startsWith(uploadDirectory)) {
            throw new BadRequestException("Nome de arquivo inválido");
        }

        try {
            Files.createDirectories(uploadDirectory);
            file.transferTo(destino);
        } catch (IOException exception) {
            throw new IllegalStateException("Não foi possível armazenar o arquivo de áudio", exception);
        }

        Lecture lecture = new Lecture();
        lecture.setTitulo(titulo.trim());
        lecture.setDescricao(descricao == null ? "" : descricao.trim());
        lecture.setAudioPath(destino.toString());
        lecture.setRequestId(requestId);
        lecture.setStatus(LectureStatus.PROCESSANDO);
        lecture.setErroProcessamento(null);

        Lecture salva;
        try {
            salva = repository.save(lecture);
        } catch (RuntimeException exception) {
            try { Files.deleteIfExists(destino); } catch (IOException cleanupException) {
                log.warn("Não foi possível remover o áudio após falha ao salvar a aula");
            }
            throw exception;
        }
        transcriptionService.agendar(salva.getId());
        return repository.findById(salva.getId()).orElse(salva);
    }

    @Transactional(readOnly = true)
    public List<LectureResponse> listar(String query) {
        if (query == null || query.isBlank()) return repository.findAllSummaries();
        String termo = query.trim();
        return repository.searchSummaries(termo);
    }

    public Lecture buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aula não encontrada"));
    }

    @Transactional
    public Lecture retry(Long id) {
        Lecture lecture = buscarPorId(id);
        boolean savedTranscript = lecture.getTranscricao() != null && !lecture.getTranscricao().isBlank();
        boolean incompleteSummary = savedTranscript
                && lecture.getTranscricao().length() >= 300
                && !StudySummaryValidator.hasStudySections(lecture.getResumo());
        if (lecture.getStatus() != LectureStatus.ERRO
                && !(lecture.getStatus() == LectureStatus.FINALIZADO && incompleteSummary)) {
            throw new BadRequestException("Esta aula não possui uma falha de resumo recuperável");
        }
        if (!savedTranscript && (lecture.getAudioPath() == null || !Files.isRegularFile(Path.of(lecture.getAudioPath())))) {
            throw new BadRequestException("O arquivo de áudio desta aula não está disponível para reprocessamento");
        }
        lecture.setStatus(LectureStatus.PROCESSANDO);
        lecture.setErroProcessamento(null);
        Lecture updated = repository.save(lecture);
        Long lectureId = updated.getId();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                if (savedTranscript) transcriptionService.agendarResumo(lectureId);
                else transcriptionService.agendar(lectureId);
            }
        });
        return updated;
    }

    @Transactional
    public void excluir(Long id) {
        Lecture lecture = buscarPorId(id);
        if (lecture.getStatus() == LectureStatus.PROCESSANDO) {
            throw new BadRequestException("Aguarde o fim do processamento antes de excluir esta aula");
        }
        repository.delete(lecture);
        String audioPath = lecture.getAudioPath();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    Path audio = Path.of(audioPath).toAbsolutePath().normalize();
                    if (audio.startsWith(uploadDirectory)) Files.deleteIfExists(audio);
                    else log.warn("Arquivo da aula {} está fora do diretório de uploads; não foi removido", id);
                } catch (IOException | RuntimeException exception) {
                    log.warn("Não foi possível remover o arquivo de áudio da aula {}", id);
                }
            }
        });
    }

    private void validarDados(MultipartFile file, String titulo, String descricao) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("O arquivo de áudio é obrigatório");
        }

        if (titulo == null || titulo.isBlank()) {
            throw new BadRequestException("O título da aula é obrigatório");
        }

        if (titulo.trim().length() > 150) {
            throw new BadRequestException("O título deve ter no máximo 150 caracteres");
        }

        if (descricao != null && descricao.trim().length() > 1000) {
            throw new BadRequestException("A descrição deve ter no máximo 1000 caracteres");
        }

        String contentType = file.getContentType();
        if (contentType != null && !contentType.toLowerCase(Locale.ROOT).startsWith("audio/")) {
            throw new BadRequestException("Envie um arquivo de áudio válido");
        }

        obterExtensao(file.getOriginalFilename());
    }

    private String obterExtensao(String originalFilename) {
        if (originalFilename == null || originalFilename.isBlank()) {
            throw new BadRequestException("O arquivo precisa possuir uma extensão de áudio válida");
        }

        String filename = Path.of(originalFilename).getFileName().toString();
        int separator = filename.lastIndexOf('.');

        if (separator < 0 || separator == filename.length() - 1) {
            throw new BadRequestException("O arquivo precisa possuir uma extensão de áudio válida");
        }

        String extensao = filename.substring(separator + 1).toLowerCase(Locale.ROOT);

        if (!EXTENSOES_PERMITIDAS.contains(extensao)) {
            throw new BadRequestException("Formato não suportado. Use M4A, AAC, MP3 ou WAV");
        }

        return extensao;
    }
}
