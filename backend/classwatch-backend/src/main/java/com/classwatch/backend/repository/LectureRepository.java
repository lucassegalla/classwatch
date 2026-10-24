package com.classwatch.backend.repository;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.AvailableLectureResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;

public interface LectureRepository extends JpaRepository<Lecture, Long> {
    List<Lecture> findByStatus(LectureStatus status);
    Optional<Lecture> findByRequestId(String requestId);
    Optional<Lecture> findByOwner_IdAndRequestId(Long ownerId, String requestId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Lecture l where l.id = :id and (l.owner.id = :ownerId or (:includeLegacy = true and l.owner is null))")
    Optional<Lecture> findForSubjectAssociation(@Param("id") Long id,
                                                @Param("ownerId") Long ownerId,
                                                @Param("includeLegacy") boolean includeLegacy);

    @Query("select new com.classwatch.backend.dto.AvailableLectureResponse(l.id, l.titulo, l.descricao, l.status, l.erroProcessamento, l.createdAt, l.updatedAt, case when l.owner is null then true else false end) "
            + "from Lecture l where (l.owner.id = :ownerId or (:includeLegacy = true and l.owner is null)) "
            + "and l.subject is null order by l.createdAt desc")
    List<AvailableLectureResponse> findUnassignedSummariesByOwnerId(@Param("ownerId") Long ownerId,
                                                                     @Param("includeLegacy") boolean includeLegacy);

    @Query("select new com.classwatch.backend.dto.LectureResponse(l.id, l.titulo, l.descricao, l.status, l.erroProcessamento, l.createdAt, l.updatedAt) "
            + "from Lecture l where (l.owner.id = :ownerId or (:includeLegacy = true and l.owner is null)) "
            + "and (:query is null or :query = '' or lower(l.titulo) like lower(concat('%', :query, '%')) "
            + "or lower(l.descricao) like lower(concat('%', :query, '%'))) order by l.createdAt desc")
    List<LectureResponse> findVisibleSummaries(@Param("ownerId") Long ownerId,
                                               @Param("includeLegacy") boolean includeLegacy,
                                               @Param("query") String query);

    @Query("select l from Lecture l where l.id = :id and (l.owner.id = :ownerId or (:includeLegacy = true and l.owner is null) "
            + "or exists (select e.id from SubjectEnrollment e where e.subject = l.subject and e.student.id = :ownerId) "
            + "or exists (select s.id from Subject s where s = l.subject and s.professor.id = :ownerId))")
    Optional<Lecture> findVisibleById(@Param("id") Long id,
                                      @Param("ownerId") Long ownerId,
                                      @Param("includeLegacy") boolean includeLegacy);

    @Query("select new com.classwatch.backend.dto.LectureResponse(l.id, l.titulo, l.descricao, l.status, l.erroProcessamento, l.createdAt, l.updatedAt) "
            + "from Lecture l where l.subject.id = :subjectId order by l.createdAt desc")
    List<LectureResponse> findSummariesBySubjectId(@Param("subjectId") Long subjectId);

    @Query("select new com.classwatch.backend.dto.LectureResponse(l.id, l.titulo, l.descricao, l.status, l.erroProcessamento, l.createdAt, l.updatedAt) from Lecture l order by l.createdAt desc")
    List<LectureResponse> findAllSummaries();

    @Query("select new com.classwatch.backend.dto.LectureResponse(l.id, l.titulo, l.descricao, l.status, l.erroProcessamento, l.createdAt, l.updatedAt) from Lecture l where lower(l.titulo) like lower(concat('%', :query, '%')) or lower(l.descricao) like lower(concat('%', :query, '%')) order by l.createdAt desc")
    List<LectureResponse> searchSummaries(@Param("query") String query);
}
