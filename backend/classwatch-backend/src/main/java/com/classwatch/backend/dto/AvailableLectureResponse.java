package com.classwatch.backend.dto;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;

import java.time.LocalDateTime;

public record AvailableLectureResponse(
        Long id,
        String titulo,
        String descricao,
        LectureStatus status,
        String erroProcessamento,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean legacy
) {
    public static AvailableLectureResponse from(Lecture lecture) {
        return new AvailableLectureResponse(
                lecture.getId(),
                lecture.getTitulo(),
                lecture.getDescricao(),
                lecture.getStatus(),
                lecture.getErroProcessamento(),
                lecture.getCreatedAt(),
                lecture.getUpdatedAt(),
                lecture.getOwner() == null
        );
    }
}
