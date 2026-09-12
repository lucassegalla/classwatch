package com.classwatch.backend.repository;

import com.classwatch.backend.model.Lecture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LectureRepository extends JpaRepository<Lecture, Long> {
    List<Lecture> findAllByOrderByCreatedAtDesc();
}
