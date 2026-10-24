package com.classwatch.backend.repository;

import com.classwatch.backend.model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByProfessor_IdOrderByCreatedAtDesc(Long professorId);
    Optional<Subject> findByCodigoIngressoAndAtivaTrue(String codigoIngresso);
    boolean existsByCodigoIngresso(String codigoIngresso);

    @Query("select s from SubjectEnrollment e join e.subject s where e.student.id = :studentId order by e.enrolledAt desc")
    List<Subject> findEnrolledByStudentId(@Param("studentId") Long studentId);
}
