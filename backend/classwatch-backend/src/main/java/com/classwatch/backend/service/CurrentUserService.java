package com.classwatch.backend.service;

import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.AppUser;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {
    private final AuthService authService;

    public CurrentUserService(AuthService authService) {
        this.authService = authService;
    }

    public AppUser from(Jwt jwt) {
        try {
            return authService.requireUser(Long.parseLong(jwt.getSubject()));
        } catch (NumberFormatException exception) {
            throw new ResourceNotFoundException("Usuário não encontrado");
        }
    }
}
