package com.classwatch.backend.repository;

import com.classwatch.backend.model.Lecture;
import org.springframework.data.jpa.repository.JpaRepository;

/*
 * Interface de acesso ao banco de dados
 *
 * JpaRepository já fornece automaticamente:
 * - save()        → salvar
 * - findAll()     → listar tudo
 * - findById()    → buscar por ID
 * - deleteById()  → deletar
 *
 * <Lecture, Long>
 * Lecture = entidade
 * Long = tipo do ID
 */
public interface LectureRepository extends JpaRepository<Lecture, Long> {
}