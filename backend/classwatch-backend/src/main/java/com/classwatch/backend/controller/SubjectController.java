package com.classwatch.backend.controller;

import com.classwatch.backend.dto.JoinSubjectRequest;
import com.classwatch.backend.dto.AvailableLectureResponse;
import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.SubjectRequest;
import com.classwatch.backend.dto.SubjectResponse;
import com.classwatch.backend.model.AppUser;
import com.classwatch.backend.service.CurrentUserService;
import com.classwatch.backend.service.LectureService;
import com.classwatch.backend.service.SubjectService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/subjects")
public class SubjectController {
    private final SubjectService subjects;
    private final LectureService lectures;
    private final CurrentUserService currentUser;

    public SubjectController(SubjectService subjects, LectureService lectures, CurrentUserService currentUser) {
        this.subjects = subjects;
        this.lectures = lectures;
        this.currentUser = currentUser;
    }

    @GetMapping
    public List<SubjectResponse> list(@AuthenticationPrincipal Jwt jwt) {
        return subjects.listFor(currentUser.from(jwt));
    }

    @PostMapping
    public ResponseEntity<SubjectResponse> create(@Valid @RequestBody SubjectRequest request,
                                                   @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(201).body(subjects.create(request, currentUser.from(jwt)));
    }

    @PostMapping("/join")
    public SubjectResponse join(@Valid @RequestBody JoinSubjectRequest request,
                                @AuthenticationPrincipal Jwt jwt) {
        return subjects.join(request.codigoIngresso(), currentUser.from(jwt));
    }

    @GetMapping("/{id}")
    public SubjectResponse get(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return subjects.get(id, currentUser.from(jwt));
    }

    @PutMapping("/{id}")
    public SubjectResponse update(@PathVariable Long id, @Valid @RequestBody SubjectRequest request,
                                  @AuthenticationPrincipal Jwt jwt) {
        return subjects.update(id, request, currentUser.from(jwt));
    }

    @PostMapping("/{id}/archive")
    public SubjectResponse archive(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return subjects.archive(id, currentUser.from(jwt));
    }

    @GetMapping("/{id}/lectures")
    public List<LectureResponse> listLectures(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return subjects.lecturesFor(id, currentUser.from(jwt));
    }

    @GetMapping("/{id}/available-lectures")
    public List<AvailableLectureResponse> listAvailableLectures(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return subjects.availableLecturesFor(id, currentUser.from(jwt));
    }

    @PostMapping("/{id}/lectures/{lectureId}")
    public LectureResponse addExistingLecture(@PathVariable Long id, @PathVariable Long lectureId,
                                              @AuthenticationPrincipal Jwt jwt) {
        return subjects.addExistingLecture(id, lectureId, currentUser.from(jwt));
    }

    @PostMapping(value = "/{id}/lectures", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LectureResponse> uploadLecture(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam("titulo") String titulo,
            @RequestParam(value = "descricao", defaultValue = "") String descricao,
            @RequestParam(value = "requestId", required = false) String requestId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        AppUser user = currentUser.from(jwt);
        return ResponseEntity.accepted().body(LectureResponse.from(
                lectures.salvarComArquivo(file, titulo, descricao, requestId, user, id)));
    }
}
