package com.classwatch.backend.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "lectures")
public class Lecture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String titulo;

    private String descricao;

    private String audioPath;

    @Column(length = 10000)
    private String transcricao;

    @Column(length = 5000)
    private String resumo;
}