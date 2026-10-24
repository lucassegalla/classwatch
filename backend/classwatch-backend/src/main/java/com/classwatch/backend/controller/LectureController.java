package com.classwatch.backend.controller;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.LectureDetailResponse;
import com.classwatch.backend.service.LectureService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/lectures")
public class LectureController {

    private final LectureService service;

    public LectureController(LectureService service) {
        this.service = service;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LectureResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("titulo") String titulo,
            @RequestParam(value = "descricao", defaultValue = "") String descricao,
            @RequestParam(value = "requestId", required = false) String requestId
    ) {
        return ResponseEntity.accepted()
                .body(LectureResponse.from(service.salvarComArquivo(file, titulo, descricao, requestId)));
    }

    @GetMapping
    public List<LectureResponse> listar(@RequestParam(value = "q", required = false) String query) {
        return service.listar(query);
    }

    @GetMapping("/{id}")
    public LectureDetailResponse buscarPorId(@PathVariable Long id) {
        return LectureDetailResponse.from(service.buscarPorId(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> excluir(@PathVariable Long id) {
        service.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<LectureResponse> retry(@PathVariable Long id) {
        return ResponseEntity.accepted().body(LectureResponse.from(service.retry(id)));
    }
}
