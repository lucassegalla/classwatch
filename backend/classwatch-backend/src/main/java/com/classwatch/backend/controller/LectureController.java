package com.classwatch.backend.controller;

import com.classwatch.backend.dto.LectureResponse;
import com.classwatch.backend.dto.LectureUpdateRequest;
import com.classwatch.backend.service.LectureService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.util.List;

@Validated
@RestController
@RequestMapping("/lectures")
public class LectureController {

    private final LectureService lectureService;

    public LectureController(LectureService lectureService) {
        this.lectureService = lectureService;
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<LectureResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("titulo")
            @NotBlank(message = "O título é obrigatório")
            @Size(max = 120, message = "O título deve ter no máximo 120 caracteres") String titulo,
            @RequestParam(value = "descricao", defaultValue = "")
            @Size(max = 500, message = "A descrição deve ter no máximo 500 caracteres") String descricao
    ) {
        LectureResponse lecture = lectureService.criarComArquivo(file, titulo, descricao);
        return ResponseEntity.created(URI.create("/lectures/" + lecture.id())).body(lecture);
    }

    @GetMapping
    public List<LectureResponse> listar() {
        return lectureService.listar();
    }

    @GetMapping("/{id}")
    public LectureResponse buscarPorId(@PathVariable Long id) {
        return lectureService.buscarPorId(id);
    }

    @PutMapping("/{id}")
    public LectureResponse atualizar(
            @PathVariable Long id,
            @Valid @RequestBody LectureUpdateRequest request
    ) {
        return lectureService.atualizar(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> remover(@PathVariable Long id) {
        lectureService.remover(id);
        return ResponseEntity.noContent().build();
    }
}
