package com.classwatch.backend.controller;

import com.classwatch.backend.model.Lecture;
import com.classwatch.backend.service.LectureService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/*
 * @RestController
 * Indica que essa classe é um controller REST
 * Ou seja, responde requisições HTTP e retorna JSON
 */
@RestController

/*
 * Define o caminho base da API
 * Tudo aqui começa com: /lectures
 */
@RequestMapping("/lectures")
public class LectureController {

    /*
     * Service responsável pela lógica de negócio
     * Controller só recebe e responde HTTP
     */
    private final LectureService service;

    /*
     * Injeção de dependência (Spring cria o service automaticamente)
     */
    public LectureController(LectureService service) {
        this.service = service;
    }

    /*
     * POST /lectures
     * Cria uma nova aula
     */
    @PostMapping
    public Lecture criar(@RequestBody Lecture lecture) {

        /*
         * @RequestBody
         * Converte o JSON enviado no Postman em objeto Java
         */
        return service.salvar(lecture);
    }

    @PostMapping("/upload")
    public Lecture upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("titulo") String titulo,
            @RequestParam("descricao") String descricao
    )  {
        return service.salvarComArquivo(file, titulo, descricao);
    }

    /*
     * GET /lectures
     * Retorna todas as aulas do banco
     */
    @GetMapping
    public List<Lecture> listar() {
        return service.listar();
    }

    /*
     * PUT /lectures/{id}
     * Atualiza uma aula existente
     */
    @PutMapping("/{id}")
    public Lecture atualizar(
            @PathVariable Long id,        // pega o ID da URL
            @RequestBody Lecture lecture  // pega o corpo JSON
    ) {
        return service.atualizar(id, lecture);
    }

    @GetMapping("/{id}")
    public Lecture buscarPorId(@PathVariable Long id) {
        return service.buscarPorId(id);
    }

}