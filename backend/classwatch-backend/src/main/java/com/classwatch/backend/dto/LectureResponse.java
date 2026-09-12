package com.classwatch.backend.dto;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;

import java.time.Instant;

public record LectureResponse(
        Long id,
        String titulo,
        String descricao,
        String transcricao,
        String resumo,
        LectureStatus status,
        String errorMessage,
        Instant createdAt,
        Instant updatedAt,
        Instant processingStartedAt,
        Instant processingFinishedAt
) {
    public static LectureResponse from(Lecture lecture) {
        return new LectureResponse(
                lecture.getId(),
                lecture.getTitulo(),
                lecture.getDescricao(),
                lecture.getTranscricao(),
                lecture.getResumo(),
                lecture.getStatus(),
                lecture.getErrorMessage(),
                lecture.getCreatedAt(),
                lecture.getUpdatedAt(),
                lecture.getProcessingStartedAt(),
                lecture.getProcessingFinishedAt()
        );
    }
}
