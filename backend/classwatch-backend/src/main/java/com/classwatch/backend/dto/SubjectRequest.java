package com.classwatch.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubjectRequest(
        @NotBlank @Size(max = 120) String nome,
        @Size(max = 1000) String descricao,
        @NotBlank @Size(max = 120) String curso,
        @NotBlank @Size(max = 120) String turma,
        @NotBlank @Size(max = 60) String periodoLetivo
) {}
