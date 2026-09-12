package com.classwatch.backend.service;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LectureServiceTest {

    private LectureRepository repository;
    private TranscriptionService transcriptionService;
    private AudioStorageService storageService;
    private LectureService service;

    @BeforeEach
    void setUp() {
        repository = mock(LectureRepository.class);
        transcriptionService = mock(TranscriptionService.class);
        storageService = mock(AudioStorageService.class);
        service = new LectureService(repository, transcriptionService, storageService);
    }

    @Test
    void criaAulaEIniciaProcessamento() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "aula.m4a", "audio/m4a", "audio".getBytes()
        );
        when(storageService.armazenar(file)).thenReturn("aula.m4a");
        when(repository.save(any(Lecture.class))).thenAnswer(invocation -> {
            Lecture lecture = invocation.getArgument(0);
            lecture.setId(1L);
            return lecture;
        });

        LectureResponse result = service.criarComArquivo(file, "  Java  ", "  Streams  ");

        assertEquals(1L, result.id());
        assertEquals("Java", result.titulo());
        assertEquals("Streams", result.descricao());
        assertEquals(LectureStatus.RECEBIDO, result.status());
        verify(transcriptionService).processar(1L);
    }

    @Test
    void informaQuandoAulaNaoExiste() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> service.buscarPorId(99L));
    }

    @Test
    void desfazPersistenciaQuandoFilaRejeitaProcessamento() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "aula.m4a", "audio/m4a", "audio".getBytes()
        );
        when(storageService.armazenar(file)).thenReturn("aula.m4a");
        when(repository.save(any(Lecture.class))).thenAnswer(invocation -> {
            Lecture lecture = invocation.getArgument(0);
            lecture.setId(7L);
            return lecture;
        });
        doThrow(new IllegalStateException("Fila cheia")).when(transcriptionService).processar(7L);

        assertThrows(
                IllegalStateException.class,
                () -> service.criarComArquivo(file, "Java", "Streams")
        );
        verify(repository).deleteById(7L);
        verify(storageService).remover("aula.m4a");
    }
}
