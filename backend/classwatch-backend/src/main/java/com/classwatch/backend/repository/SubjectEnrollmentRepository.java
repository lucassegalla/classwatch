package com.classwatch.backend.repository;

import com.classwatch.backend.model.SubjectEnrollment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubjectEnrollmentRepository extends JpaRepository<SubjectEnrollment, Long> {
    boolean existsBySubject_IdAndStudent_Id(Long subjectId, Long studentId);
}
