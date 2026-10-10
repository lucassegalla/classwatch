package com.classwatch.backend.dto;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;

import java.time.LocalDateTime;

public record LectureResponse(
        Long id,
        String titulo,
        String descricao,
        String transcricao,
        String resumo,
        LectureStatus status,
        String erroProcessamento,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static LectureResponse from(Lecture lecture) {
        return new LectureResponse(
                lecture.getId(),
                lecture.getTitulo(),
                lecture.getDescricao(),
                lecture.getTranscricao(),
                lecture.getResumo(),
                lecture.getStatus(),
                lecture.getErroProcessamento(),
                lecture.getCreatedAt(),
                lecture.getUpdatedAt()
        );
    }
}
