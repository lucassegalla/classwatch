package com.classwatch.backend.controller;

import com.classwatch.backend.dto.LectureResponse;
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
            @RequestParam(value = "descricao", defaultValue = "") String descricao
    ) {
        return ResponseEntity.accepted()
                .body(LectureResponse.from(service.salvarComArquivo(file, titulo, descricao)));
    }

    @GetMapping
    public List<LectureResponse> listar() {
        return service.listar().stream()
                .map(LectureResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public LectureResponse buscarPorId(@PathVariable Long id) {
        return LectureResponse.from(service.buscarPorId(id));
    }
}
