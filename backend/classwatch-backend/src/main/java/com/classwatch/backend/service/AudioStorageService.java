package com.classwatch.backend.service;

import com.classwatch.backend.exception.StorageException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class AudioStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of("m4a", "aac", "mp3", "wav", "mp4", "webm", "ogg", "3gp");

    private final Path uploadDirectory;

    public AudioStorageService(@Value("${app.storage.upload-dir:uploads}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    public String armazenar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("O arquivo de áudio é obrigatório");
        }

        String originalName = StringUtils.cleanPath(
                file.getOriginalFilename() == null ? "audio.m4a" : file.getOriginalFilename()
        );
        String extension = extrairExtensao(originalName);

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Formato de áudio não suportado: " + extension);
        }

        String storageKey = UUID.randomUUID() + "." + extension;
        Path destination = resolver(storageKey);

        try {
            Files.createDirectories(uploadDirectory);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, destination, StandardCopyOption.REPLACE_EXISTING);
            }
            return storageKey;
        } catch (IOException exception) {
            throw new StorageException("Não foi possível armazenar o áudio", exception);
        }
    }

    public Path resolver(String storageKey) {
        Path resolved = uploadDirectory.resolve(storageKey).normalize();
        if (!resolved.startsWith(uploadDirectory)) {
            throw new IllegalArgumentException("Caminho de áudio inválido");
        }
        return resolved;
    }

    public void remover(String storageKey) {
        if (storageKey == null || storageKey.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(resolver(storageKey));
        } catch (IllegalArgumentException exception) {
            log.warn("Registro antigo possui um caminho de áudio fora do diretório atual; somente o registro será removido");
        } catch (IOException exception) {
            throw new StorageException("Não foi possível remover o áudio", exception);
        }
    }

    private String extrairExtensao(String fileName) {
        int lastDot = fileName.lastIndexOf('.');
        if (lastDot < 0 || lastDot == fileName.length() - 1) {
            throw new IllegalArgumentException("O arquivo precisa ter uma extensão válida");
        }
        return fileName.substring(lastDot + 1).toLowerCase(Locale.ROOT);
    }
}
