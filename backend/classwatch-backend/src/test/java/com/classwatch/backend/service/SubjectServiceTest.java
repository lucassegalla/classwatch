package com.classwatch.backend.service;

import com.classwatch.backend.dto.SubjectRequest;
import com.classwatch.backend.dto.AvailableLectureResponse;
import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.exception.ConflictException;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.AppUser;
import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.model.LectureStatus;
import com.classwatch.backend.model.Subject;
import com.classwatch.backend.model.SubjectEnrollment;
import com.classwatch.backend.model.UserRole;
import com.classwatch.backend.repository.LectureRepository;
import com.classwatch.backend.repository.SubjectEnrollmentRepository;
import com.classwatch.backend.repository.SubjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;

import java.util.*;
import java.lang.reflect.Proxy;

import static org.junit.jupiter.api.Assertions.*;

class SubjectServiceTest {
    private final Map<Long, Subject> subjectRows = new HashMap<>();
    private final Map<Long, Lecture> lectureRows = new HashMap<>();
    private final Set<String> enrolled = new HashSet<>();
    private SubjectService service;
    private AppUser professor;
    private AppUser otherProfessor;
    private AppUser student;

    @BeforeEach
    void setUp() {
        subjectRows.clear();
        lectureRows.clear();
        enrolled.clear();
        professor = user(1L, UserRole.PROFESSOR, "Professora");
        otherProfessor = user(2L, UserRole.PROFESSOR, "Outro professor");
        student = user(3L, UserRole.ESTUDANTE, "Estudante");

        SubjectRepository subjects = (SubjectRepository) Proxy.newProxyInstance(
                SubjectRepository.class.getClassLoader(), new Class<?>[]{SubjectRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "save", "saveAndFlush" -> {
                        Subject subject = (Subject) args[0];
                        if (subject.getId() == null) subject.setId((long) subjectRows.size() + 10);
                        if (subject.getCreatedAt() == null) subject.setCreatedAt(java.time.LocalDateTime.now());
                        subjectRows.put(subject.getId(), subject);
                        yield subject;
                    }
                    case "findById" -> Optional.ofNullable(subjectRows.get(args[0]));
                    case "findByCodigoIngressoAndAtivaTrue" -> subjectRows.values().stream()
                            .filter(s -> s.isAtiva() && s.getCodigoIngresso().equals(args[0])).findFirst();
                    case "existsByCodigoIngresso" -> subjectRows.values().stream().anyMatch(s -> s.getCodigoIngresso().equals(args[0]));
                    case "findByProfessor_IdOrderByCreatedAtDesc" -> subjectRows.values().stream()
                            .filter(s -> s.getProfessor().getId().equals(args[0])).toList();
                    case "findEnrolledByStudentId" -> subjectRows.values().stream()
                            .filter(s -> enrolled.contains(key(s.getId(), (Long) args[0]))).toList();
                    case "toString" -> "SubjectRepository test double";
                    default -> throw new UnsupportedOperationException(method.getName());
                });

        SubjectEnrollmentRepository memberships = (SubjectEnrollmentRepository) Proxy.newProxyInstance(
                SubjectEnrollmentRepository.class.getClassLoader(), new Class<?>[]{SubjectEnrollmentRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "existsBySubject_IdAndStudent_Id" -> enrolled.contains(key((Long) args[0], (Long) args[1]));
                    case "saveAndFlush" -> {
                        SubjectEnrollment enrollment = (SubjectEnrollment) args[0];
                        enrolled.add(key(enrollment.getSubject().getId(), enrollment.getStudent().getId()));
                        yield enrollment;
                    }
                    case "toString" -> "SubjectEnrollmentRepository test double";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        LectureRepository lectures = (LectureRepository) Proxy.newProxyInstance(
                LectureRepository.class.getClassLoader(), new Class<?>[]{LectureRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findSummariesBySubjectId" -> lectureRows.values().stream()
                            .filter(lecture -> lecture.getSubject() != null && lecture.getSubject().getId().equals(args[0]))
                            .map(LectureResponse::from).toList();
                    case "findUnassignedSummariesByOwnerId" -> lectureRows.values().stream()
                            .filter(lecture -> lecture.getSubject() == null && (lecture.getOwner() == null
                                    ? (Boolean) args[1]
                                    : lecture.getOwner().getId().equals(args[0])))
                            .map(lecture -> new AvailableLectureResponse(lecture.getId(), lecture.getTitulo(),
                                    lecture.getDescricao(), lecture.getStatus(), lecture.getErroProcessamento(),
                                    lecture.getCreatedAt(), lecture.getUpdatedAt(), lecture.getOwner() == null)).toList();
                    case "findForSubjectAssociation" -> Optional.ofNullable(lectureRows.get(args[0])).filter(lecture ->
                            lecture.getOwner() != null && lecture.getOwner().getId().equals(args[1])
                                    || lecture.getOwner() == null && (Boolean) args[2]);
                    case "save" -> {
                        Lecture lecture = (Lecture) args[0];
                        lectureRows.put(lecture.getId(), lecture);
                        yield lecture;
                    }
                    case "toString" -> "LectureRepository test double";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        service = new SubjectService(subjects, memberships, lectures);
    }

    @Test
    void professorCreatesMateriaWithCodeAndFields() {
        var response = service.create(request("Redes", "Computação", "Noite", "2026.2"), professor);
        assertEquals("Redes", response.nome());
        assertEquals("Computação", response.curso());
        assertEquals("Noite", response.turma());
        assertEquals("2026.2", response.periodoLetivo());
        assertTrue(response.ativa());
        assertNotNull(response.createdAt());
        assertTrue(response.codigoIngresso().matches("[A-HJ-NP-Z2-9]{8}"));
        assertEquals(professor.getId(), response.professorId());
    }

    @Test
    void estudanteNaoPodeCriarMateria() {
        assertThrows(AccessDeniedException.class, () -> service.create(request("Redes", "Computação", "Noite", "2026.2"), student));
    }

    @Test
    void professorNaoPodeEditarMateriaDeOutroProfessor() {
        Subject subject = subject(12L, professor, true, "ACESS123");
        assertThrows(ResourceNotFoundException.class, () -> service.update(subject.getId(),
                request("Alterada", "Curso", "Turma", "2026"), otherProfessor));
        assertEquals("Redes", subject.getNome());
    }

    @Test
    void professorEditaEArquivaSomenteMateriaPropria() {
        Subject subject = subject(16L, professor, true, "EDIT1234");
        assertEquals("Banco de dados", service.update(subject.getId(),
                request("Banco de dados", "Sistemas", "Manhã", "2026.2"), professor).nome());
        assertEquals("Sistemas", subject.getCurso());
        assertFalse(service.archive(subject.getId(), professor).ativa());
        assertThrows(ConflictException.class, () -> service.update(subject.getId(),
                request("Alterada", "Sistemas", "Manhã", "2026.2"), professor));
    }

    @Test
    void estudanteEntraComCodigoAtivoMasNaoPodeDuplicarInscricao() {
        Subject subject = subject(13L, professor, true, "ACESS456");
        assertEquals(subject.getId(), service.join(" acess456 ", student).id());
        assertTrue(enrolled.contains(key(subject.getId(), student.getId())));
        assertNull(service.get(subject.getId(), student).codigoIngresso());
        assertNull(service.get(subject.getId(), student).professorId());
        assertThrows(ConflictException.class, () -> service.join("ACESS456", student));
        assertEquals(subject.getId(), service.listFor(student).get(0).id());
    }

    @Test
    void codigoInvalidoOuMateriaArquivadaNaoPermiteIngresso() {
        subject(14L, professor, false, "ARCHIVED");
        assertThrows(ResourceNotFoundException.class, () -> service.join("ARCHIVED", student));
        assertThrows(ResourceNotFoundException.class, () -> service.join("INVALID", student));
    }

    @Test
    void estudanteNaoInscritoNaoLeMateriaNemListaSuasAulas() {
        Subject subject = subject(15L, professor, true, "STUDY123");
        assertThrows(ResourceNotFoundException.class, () -> service.get(subject.getId(), student));
        assertThrows(ResourceNotFoundException.class, () -> service.lecturesFor(subject.getId(), student));
    }

    @Test
    void lectureNovaContinuaSemMateriaQuandoNaoAssociada() {
        assertNull(new Lecture().getSubject());
    }

    @Test
    void professorPodeAssociarAulaExistentePropriaSemMateria() {
        Subject subject = subject(20L, professor, true, "REDE2026");
        Lecture lecture = lecture(201L, professor, null);

        LectureResponse response = service.addExistingLecture(subject.getId(), lecture.getId(), professor);

        assertEquals(lecture.getId(), response.id());
        assertEquals(subject, lecture.getSubject());
        assertEquals("Aula histórica", lecture.getTitulo());
        assertEquals("Transcrição preservada", lecture.getTranscricao());
        assertEquals(1, service.lecturesFor(subject.getId(), professor).size());
    }

    @Test
    void professorSoVeParaAssociacaoAulasPropriasAindaSemMateria() {
        subject(21L, professor, true, "REDE2027");
        Lecture ownUnassigned = lecture(211L, professor, null);
        Lecture legacyUnassigned = lecture(214L, null, null);
        lecture(212L, otherProfessor, null);
        Subject otherSubject = subject(22L, professor, true, "REDE2028");
        lecture(213L, professor, otherSubject);

        List<AvailableLectureResponse> available = service.availableLecturesFor(21L, professor);

        assertEquals(Set.of(ownUnassigned.getId(), legacyUnassigned.getId()), available.stream().map(AvailableLectureResponse::id).collect(java.util.stream.Collectors.toSet()));
        assertTrue(available.stream().filter(item -> item.id().equals(legacyUnassigned.getId())).findFirst().orElseThrow().legacy());
    }

    @Test
    void naoPermiteAssociarAulaDeOutroProfessorOuMoverAulaDeOutraMateria() {
        Subject subject = subject(23L, professor, true, "REDE2029");
        Subject otherSubject = subject(24L, professor, true, "REDE2030");
        Lecture otherOwnerLecture = lecture(231L, otherProfessor, null);
        Lecture alreadyAssigned = lecture(232L, professor, otherSubject);

        assertThrows(ResourceNotFoundException.class,
                () -> service.addExistingLecture(subject.getId(), otherOwnerLecture.getId(), professor));
        assertThrows(ConflictException.class,
                () -> service.addExistingLecture(subject.getId(), alreadyAssigned.getId(), professor));
        assertEquals(otherSubject, alreadyAssigned.getSubject());
    }

    @Test
    void naoPermiteAssociarAulaAMateriaArquivadaOuDuplicarAssociacao() {
        Subject active = subject(25L, professor, true, "REDE2031");
        Subject archived = subject(26L, professor, false, "REDE2032");
        Lecture lecture = lecture(251L, professor, null);

        assertThrows(ConflictException.class,
                () -> service.addExistingLecture(archived.getId(), lecture.getId(), professor));
        service.addExistingLecture(active.getId(), lecture.getId(), professor);
        assertThrows(ConflictException.class,
                () -> service.addExistingLecture(active.getId(), lecture.getId(), professor));
    }

    @Test
    void professorPodeVincularAulaLegadaSemProprietarioEAssumeSuaPropriedade() {
        Subject subject = subject(27L, professor, true, "REDE2033");
        Lecture legacy = lecture(271L, null, null);

        service.addExistingLecture(subject.getId(), legacy.getId(), professor);

        assertEquals(professor, legacy.getOwner());
        assertEquals(subject, legacy.getSubject());
    }

    private Subject subject(long id, AppUser owner, boolean active, String code) {
        Subject subject = new Subject();
        subject.setId(id);
        subject.setNome("Redes");
        subject.setDescricao("Fundamentos de rede");
        subject.setCurso("Computação");
        subject.setTurma("Noite");
        subject.setPeriodoLetivo("2026.2");
        subject.setProfessor(owner);
        subject.setCodigoIngresso(code);
        subject.setAtiva(active);
        subjectRows.put(id, subject);
        return subject;
    }

    private AppUser user(long id, UserRole role, String name) {
        AppUser user = new AppUser();
        user.setId(id);
        user.setRole(role);
        user.setName(name);
        user.setEmail(name.toLowerCase(Locale.ROOT).replace(' ', '.') + "@example.com");
        return user;
    }

    private Lecture lecture(long id, AppUser owner, Subject subject) {
        Lecture lecture = new Lecture();
        lecture.setId(id);
        lecture.setOwner(owner);
        lecture.setSubject(subject);
        lecture.setTitulo("Aula histórica");
        lecture.setDescricao("Descrição da aula");
        lecture.setTranscricao("Transcrição preservada");
        lecture.setResumo("Resumo preservado");
        lecture.setStatus(LectureStatus.FINALIZADO);
        lectureRows.put(id, lecture);
        return lecture;
    }

    private SubjectRequest request(String name, String course, String group, String period) {
        return new SubjectRequest(name, "Descrição", course, group, period);
    }

    private String key(Long subjectId, Long studentId) { return subjectId + ":" + studentId; }
}
