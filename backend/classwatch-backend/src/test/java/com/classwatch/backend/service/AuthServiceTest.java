package com.classwatch.backend.service;

import com.classwatch.backend.dto.LoginRequest;
import com.classwatch.backend.dto.RegisterStudentRequest;
import com.classwatch.backend.exception.DuplicateEmailException;
import com.classwatch.backend.model.AppUser;
import com.classwatch.backend.model.UserRole;
import com.classwatch.backend.repository.AppUserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;

import java.lang.reflect.Proxy;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class AuthServiceTest {
    private final Map<String, AppUser> accounts = new HashMap<>();
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private AuthService auth;

    @BeforeEach
    void setUp() {
        accounts.clear();
        AppUserRepository users = (AppUserRepository) Proxy.newProxyInstance(
                AppUserRepository.class.getClassLoader(), new Class<?>[]{AppUserRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "existsByEmail" -> accounts.containsKey(args[0]);
                    case "findByEmail" -> Optional.ofNullable(accounts.get(args[0]));
                    case "existsByRole" -> accounts.values().stream().anyMatch(user -> user.getRole() == args[0]);
                    case "findById" -> accounts.values().stream().filter(user -> user.getId().equals(args[0])).findFirst();
                    case "saveAndFlush", "save" -> {
                        AppUser user = (AppUser) args[0];
                        if (user.getId() == null) user.setId((long) accounts.size() + 1);
                        accounts.put(user.getEmail(), user);
                        yield user;
                    }
                    case "toString" -> "InMemoryAppUserRepository";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        JwtEncoder jwtEncoder = parameters -> {
            Instant now = Instant.now();
            return Jwt.withTokenValue("signed-token")
                    .header("alg", "HS256")
                    .issuedAt(now)
                    .expiresAt(parameters.getClaims().getExpiresAt())
                    .subject(parameters.getClaims().getSubject())
                    .build();
        };
        auth = new AuthService(users, passwordEncoder, jwtEncoder, "classwatch-test", 3600);
    }

    @Test
    void cadastraEstudanteSalvandoSomenteHashBCrypt() {
        var result = auth.registerStudent(new RegisterStudentRequest("Ana", "Ana@Example.com", "senha-segura"));
        AppUser saved = accounts.get("ana@example.com");
        assertEquals(UserRole.ESTUDANTE, saved.getRole());
        assertNotEquals("senha-segura", saved.getPasswordHash());
        assertTrue(passwordEncoder.matches("senha-segura", saved.getPasswordHash()));
        assertEquals("signed-token", result.accessToken());
        assertEquals("ana@example.com", result.user().email());
    }

    @Test
    void rejeitaEmailDuplicado() {
        auth.registerStudent(new RegisterStudentRequest("Ana", "ana@example.com", "senha-segura"));
        assertThrows(DuplicateEmailException.class, () -> auth.registerStudent(
                new RegisterStudentRequest("Outra Ana", "ANA@example.com", "outra-senha")));
        assertEquals(1, accounts.size());
    }

    @Test
    void loginValidoEmiteTokenEsenhaIncorretaERejeitada() {
        auth.registerStudent(new RegisterStudentRequest("Ana", "ana@example.com", "senha-segura"));
        assertEquals("signed-token", auth.login(new LoginRequest("ana@example.com", "senha-segura")).accessToken());
        assertThrows(BadCredentialsException.class, () -> auth.login(new LoginRequest("ana@example.com", "errada")));
        assertThrows(BadCredentialsException.class, () -> auth.login(new LoginRequest("ausente@example.com", "senha-segura")));
    }

    @Test
    void bootstrapNuncaPromoveEstudanteExistente() {
        auth.registerStudent(new RegisterStudentRequest("Ana", "ana@example.com", "senha-segura"));
        auth.bootstrapProfessor("ana@example.com", "senha-professor");
        assertEquals(UserRole.ESTUDANTE, accounts.get("ana@example.com").getRole());
        assertEquals(1, accounts.size());
    }
}
