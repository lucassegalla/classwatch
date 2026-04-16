package com.classwatch.backend.controller;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.service.LectureService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lectures")
public class LectureController {

    private final LectureService service;

    public LectureController(LectureService service) {
        this.service = service;
    }

    @PostMapping
    public Lecture criar(@RequestBody Lecture lecture) {
        return service.salvar(lecture);
    }

    @GetMapping
    public List<Lecture> listar() {
        return service.listar();
    }

    @PutMapping("/{id}")
    public Lecture atualizar(@PathVariable Long id, @RequestBody Lecture lecture) {
        return service.atualizar(id, lecture);
    }

}