package com.classwatch.backend.service;

import com.classwatch.backend.exception.BadRequestException;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class LectureService {

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
        validarDados(file, titulo, descricao);

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
        lecture.setStatus(LectureStatus.PROCESSANDO);
        lecture.setErroProcessamento(null);

        Lecture salva = repository.save(lecture);
        transcriptionService.processar(salva.getId());
        return salva;
    }

    public List<Lecture> listar() {
        return repository.findAllByOrderByIdDesc();
    }

    public Lecture buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Aula não encontrada"));
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
