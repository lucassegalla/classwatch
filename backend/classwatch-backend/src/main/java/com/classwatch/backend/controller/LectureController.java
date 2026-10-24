package com.classwatch.backend.controller;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.LectureDetailResponse;
import com.classwatch.backend.service.LectureService;
import com.classwatch.backend.service.CurrentUserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/lectures")
public class LectureController {

    private final LectureService service;
    private final CurrentUserService currentUserService;

    public LectureController(LectureService service, CurrentUserService currentUserService) {
        this.service = service;
        this.currentUserService = currentUserService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LectureResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("titulo") String titulo,
            @RequestParam(value = "descricao", defaultValue = "") String descricao,
            @RequestParam(value = "requestId", required = false) String requestId,
            @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.accepted()
                .body(LectureResponse.from(service.salvarComArquivo(file, titulo, descricao, requestId, currentUserService.from(jwt))));
    }

    @GetMapping
    public List<LectureResponse> listar(@RequestParam(value = "q", required = false) String query,
                                        @AuthenticationPrincipal Jwt jwt) {
        return service.listar(query, currentUserService.from(jwt));
    }

    @GetMapping("/{id}")
    public LectureDetailResponse buscarPorId(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return LectureDetailResponse.from(service.buscarPorId(id, currentUserService.from(jwt)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        service.excluir(id, currentUserService.from(jwt));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<LectureResponse> retry(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.accepted().body(LectureResponse.from(service.retry(id, currentUserService.from(jwt))));
    }
}
