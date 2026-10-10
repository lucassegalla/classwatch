package com.classwatch.backend.service;

import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.repository.LectureRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

@Service
public class ProcessingRecoveryService {

    private static final Logger log = LoggerFactory.getLogger(ProcessingRecoveryService.class);

    private final LectureRepository repository;
    private final TranscriptionService transcriptionService;

    public ProcessingRecoveryService(LectureRepository repository,
                                     TranscriptionService transcriptionService) {
        this.repository = repository;
        this.transcriptionService = transcriptionService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void recuperarProcessamentosInterrompidos() {
        var pendentes = repository.findByStatus(LectureStatus.PROCESSANDO);

        if (!pendentes.isEmpty()) {
            log.info("Recuperando {} aula(s) que estavam em processamento", pendentes.size());
        }

        pendentes.forEach(lecture -> transcriptionService.processar(lecture.getId()));
    }
}
