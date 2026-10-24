package com.classwatch.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class BootstrapProfessorRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(BootstrapProfessorRunner.class);
    private final AuthService authService;
    private final String email;
    private final String password;

    public BootstrapProfessorRunner(AuthService authService,
                                    @Value("${classwatch.security.bootstrap-teacher-email:}") String email,
                                    @Value("${classwatch.security.bootstrap-teacher-password:}") String password) {
        this.authService = authService;
        this.email = email;
        this.password = password;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (email == null || email.isBlank() || password == null || password.isBlank()) return;
        authService.bootstrapProfessor(email, password);
        log.info("Bootstrap de professor processado; credenciais não são registradas no log");
    }
}
