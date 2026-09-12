package com.classwatch.backend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AudioStorageServiceTest {

    @TempDir
    Path tempDirectory;

    @Test
    void armazenaEExcluiAudio() throws Exception {
        AudioStorageService service = new AudioStorageService(tempDirectory.toString());
        byte[] content = "audio".getBytes();
        MockMultipartFile file = new MockMultipartFile("file", "aula.m4a", "audio/m4a", content);

        String key = service.armazenar(file);
        Path stored = service.resolver(key);

        assertTrue(Files.exists(stored));
        assertArrayEquals(content, Files.readAllBytes(stored));

        service.remover(key);
        assertFalse(Files.exists(stored));
    }

    @Test
    void rejeitaExtensaoDesconhecida() {
        AudioStorageService service = new AudioStorageService(tempDirectory.toString());
        MockMultipartFile file = new MockMultipartFile("file", "aula.exe", "application/octet-stream", new byte[]{1});

        assertThrows(IllegalArgumentException.class, () -> service.armazenar(file));
    }
}
