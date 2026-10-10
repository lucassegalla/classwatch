package com.classwatch.backend.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "lectures")
public class Lecture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String titulo;

    @Column(length = 1000)
    private String descricao;

    @Column(nullable = false, length = 2048)
    private String audioPath;

    @Lob
    private String transcricao;

    @Lob
    private String resumo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LectureStatus status;

    @Column(length = 1000)
    private String erroProcessamento;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    void prePersist() {
        LocalDateTime agora = LocalDateTime.now();
        createdAt = agora;
        updatedAt = agora;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
