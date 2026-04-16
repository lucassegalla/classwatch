package com.classwatch.backend.controller;

import com.classwatch.backend.model.User;
import com.classwatch.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping
    public User criarUsuario(@RequestBody User user) {
        return userService.salvar(user);
    }
}