package com.classwatch.backend.dto;

import com.classwatch.backend.model.Subject;

import java.time.LocalDateTime;

public record SubjectResponse(
        Long id,
        String nome,
        String descricao,
        String curso,
        String turma,
        String periodoLetivo,
        Long professorId,
        String professorNome,
        String codigoIngresso,
        boolean ativa,
        LocalDateTime createdAt
) {
    public static SubjectResponse from(Subject subject, boolean exposeCode) {
        return new SubjectResponse(subject.getId(), subject.getNome(), subject.getDescricao(), subject.getCurso(),
                subject.getTurma(), subject.getPeriodoLetivo(), exposeCode ? subject.getProfessor().getId() : null,
                subject.getProfessor().getName(), exposeCode ? subject.getCodigoIngresso() : null,
                subject.isAtiva(), subject.getCreatedAt());
    }
}
