package com.classwatch.backend.controller;

import com.classwatch.backend.model.User;
import com.classwatch.backend.service.UserService;
import org.springframework.web.bind.annotation.*;

/*
 * Controller REST para usuários
 */
@RestController

/*
 * Caminho base: /users
 */
@RequestMapping("/users")
public class UserController {

    /*
     * Service de usuário
     */
    private final UserService userService;

    /*
     * Injeção por construtor (melhor prática)
     * Evita problemas e é mais consistente com seu LectureController
     */
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /*
     * POST /users
     * Cria um novo usuário
     */
    @PostMapping
    public User criarUsuario(@RequestBody User user) {
        return userService.salvar(user);
    }
}