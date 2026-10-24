package com.classwatch.backend.service;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.AvailableLectureResponse;
import com.classwatch.backend.dto.SubjectRequest;
import com.classwatch.backend.dto.SubjectResponse;
import com.classwatch.backend.exception.ConflictException;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.AppUser;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.Subject;
import com.classwatch.backend.model.SubjectEnrollment;
import com.classwatch.backend.model.UserRole;
import com.classwatch.backend.repository.LectureRepository;
import com.classwatch.backend.repository.SubjectEnrollmentRepository;
import com.classwatch.backend.repository.SubjectRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.List;

@Service
public class SubjectService {
    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final SubjectRepository subjects;
    private final SubjectEnrollmentRepository enrollments;
    private final LectureRepository lectures;

    public SubjectService(SubjectRepository subjects, SubjectEnrollmentRepository enrollments, LectureRepository lectures) {
        this.subjects = subjects;
        this.enrollments = enrollments;
        this.lectures = lectures;
    }

    @Transactional
    public SubjectResponse create(SubjectRequest request, AppUser professor) {
        requireProfessor(professor);
        Subject subject = new Subject();
        apply(subject, request);
        subject.setProfessor(professor);
        subject.setCodigoIngresso(generateUniqueCode());
        subject.setAtiva(true);
        return SubjectResponse.from(subjects.saveAndFlush(subject), true);
    }

    @Transactional(readOnly = true)
    public List<SubjectResponse> listFor(AppUser user) {
        List<Subject> rows = user.getRole() == UserRole.PROFESSOR
                ? subjects.findByProfessor_IdOrderByCreatedAtDesc(user.getId())
                : subjects.findEnrolledByStudentId(user.getId());
        return rows.stream().map(subject -> SubjectResponse.from(subject,
                user.getRole() == UserRole.PROFESSOR && subject.getProfessor().getId().equals(user.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public SubjectResponse get(Long id, AppUser user) {
        Subject subject = requireAccessible(id, user);
        return SubjectResponse.from(subject, isOwner(subject, user));
    }

    @Transactional
    public SubjectResponse update(Long id, SubjectRequest request, AppUser professor) {
        Subject subject = requireProfessorOwned(id, professor);
        if (!subject.isAtiva()) throw new ConflictException("Matérias arquivadas não podem ser editadas");
        apply(subject, request);
        return SubjectResponse.from(subjects.save(subject), true);
    }

    @Transactional
    public SubjectResponse archive(Long id, AppUser professor) {
        Subject subject = requireProfessorOwned(id, professor);
        subject.setAtiva(false);
        return SubjectResponse.from(subjects.save(subject), true);
    }

    @Transactional
    public SubjectResponse join(String codeValue, AppUser student) {
        requireStudent(student);
        String code = codeValue == null ? "" : codeValue.strip().toUpperCase(java.util.Locale.ROOT);
        Subject subject = subjects.findByCodigoIngressoAndAtivaTrue(code)
                .orElseThrow(() -> new ResourceNotFoundException("Código inválido ou matéria arquivada"));
        if (enrollments.existsBySubject_IdAndStudent_Id(subject.getId(), student.getId())) {
            throw new ConflictException("Você já está inscrito nesta matéria");
        }
        SubjectEnrollment enrollment = new SubjectEnrollment();
        enrollment.setSubject(subject);
        enrollment.setStudent(student);
        try {
            enrollments.saveAndFlush(enrollment);
        } catch (DataIntegrityViolationException exception) {
            throw new ConflictException("Você já está inscrito nesta matéria");
        }
        return SubjectResponse.from(subject, false);
    }

    @Transactional(readOnly = true)
    public List<LectureResponse> lecturesFor(Long subjectId, AppUser user) {
        requireAccessible(subjectId, user);
        return lectures.findSummariesBySubjectId(subjectId);
    }

    @Transactional(readOnly = true)
    public List<AvailableLectureResponse> availableLecturesFor(Long subjectId, AppUser professor) {
        requireProfessorOwned(subjectId, professor);
        return lectures.findUnassignedSummariesByOwnerId(professor.getId(), true);
    }

    @Transactional
    public LectureResponse addExistingLecture(Long subjectId, Long lectureId, AppUser professor) {
        Subject subject = requireProfessorOwned(subjectId, professor);
        if (!subject.isAtiva()) throw new ConflictException("Não é possível adicionar aulas a uma matéria arquivada");
        Lecture lecture = lectures.findForSubjectAssociation(lectureId, professor.getId(), true)
                .orElseThrow(() -> new ResourceNotFoundException("Aula não encontrada"));
        if (lecture.getSubject() != null) {
            if (lecture.getSubject().getId().equals(subjectId)) throw new ConflictException("Esta aula já está nesta matéria");
            throw new ConflictException("A aula já pertence a outra matéria");
        }
        if (lecture.getOwner() == null) lecture.setOwner(professor);
        lecture.setSubject(subject);
        return LectureResponse.from(lectures.save(lecture));
    }

    @Transactional(readOnly = true)
    public Subject requireProfessorOwned(Long id, AppUser professor) {
        requireProfessor(professor);
        Subject subject = subjects.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));
        if (!isOwner(subject, professor)) throw new ResourceNotFoundException("Matéria não encontrada");
        return subject;
    }

    @Transactional(readOnly = true)
    public Subject requireAccessible(Long id, AppUser user) {
        Subject subject = subjects.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Matéria não encontrada"));
        if (isOwner(subject, user)) return subject;
        if (user.getRole() == UserRole.ESTUDANTE
                && enrollments.existsBySubject_IdAndStudent_Id(subject.getId(), user.getId())) return subject;
        throw new ResourceNotFoundException("Matéria não encontrada");
    }

    private void apply(Subject subject, SubjectRequest request) {
        subject.setNome(request.nome().strip());
        subject.setDescricao(request.descricao() == null ? "" : request.descricao().strip());
        subject.setCurso(request.curso().strip());
        subject.setTurma(request.turma().strip());
        subject.setPeriodoLetivo(request.periodoLetivo().strip());
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder code = new StringBuilder(8);
            for (int i = 0; i < 8; i++) code.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
            String candidate = code.toString();
            if (!subjects.existsByCodigoIngresso(candidate)) return candidate;
        }
        throw new IllegalStateException("Não foi possível gerar um código de ingresso único");
    }

    private boolean isOwner(Subject subject, AppUser user) {
        return user.getRole() == UserRole.PROFESSOR && subject.getProfessor().getId().equals(user.getId());
    }

    private void requireProfessor(AppUser user) {
        if (user.getRole() != UserRole.PROFESSOR) throw new AccessDeniedException("Somente professores podem administrar matérias");
    }

    private void requireStudent(AppUser user) {
        if (user.getRole() != UserRole.ESTUDANTE) throw new AccessDeniedException("Somente estudantes podem ingressar em matérias");
    }
}
