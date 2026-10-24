package com.classwatch.backend.service;

import com.classwatch.backend.dto.AuthResponse;
import com.classwatch.backend.dto.LoginRequest;
import com.classwatch.backend.dto.RegisterStudentRequest;
import com.classwatch.backend.dto.UserProfileResponse;
import com.classwatch.backend.exception.BadRequestException;
import com.classwatch.backend.exception.DuplicateEmailException;
import com.classwatch.backend.exception.ResourceNotFoundException;
import com.classwatch.backend.model.AppUser;
import com.classwatch.backend.model.UserRole;
import com.classwatch.backend.repository.AppUserRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.List;

@Service
public class AuthService {
    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtEncoder jwtEncoder;
    private final String issuer;
    private final Duration tokenTtl;

    public AuthService(AppUserRepository users, PasswordEncoder passwordEncoder, JwtEncoder jwtEncoder,
                       @org.springframework.beans.factory.annotation.Value("${classwatch.security.jwt-issuer}") String issuer,
                       @org.springframework.beans.factory.annotation.Value("${classwatch.security.jwt-ttl-seconds}") long tokenTtlSeconds) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtEncoder = jwtEncoder;
        this.issuer = issuer;
        if (tokenTtlSeconds < 60 || tokenTtlSeconds > 86400) {
            throw new IllegalArgumentException("JWT TTL deve estar entre 60 e 86400 segundos");
        }
        this.tokenTtl = Duration.ofSeconds(tokenTtlSeconds);
    }

    @Transactional
    public AuthResponse registerStudent(RegisterStudentRequest request) {
        String email = normalizeEmail(request.email());
        validatePasswordBytes(request.password());
        if (users.existsByEmail(email)) throw new DuplicateEmailException();
        AppUser user = new AppUser();
        user.setName(request.name().strip());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(UserRole.ESTUDANTE);
        return issueToken(saveUnique(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        if (request.password().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadCredentialsException("E-mail ou senha inválidos");
        }
        AppUser user = users.findByEmail(email)
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.getPasswordHash()))
                .orElseThrow(() -> new BadCredentialsException("E-mail ou senha inválidos"));
        return issueToken(user);
    }

    @Transactional(readOnly = true)
    public UserProfileResponse profile(Long userId) {
        return UserProfileResponse.from(users.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado")));
    }

    @Transactional(readOnly = true)
    public AppUser requireUser(Long userId) {
        return users.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado"));
    }

    @Transactional
    public void bootstrapProfessor(String emailValue, String password) {
        if (emailValue == null || emailValue.isBlank() || password == null || password.isBlank()) return;
        String email = normalizeEmail(emailValue);
        if (users.existsByRole(UserRole.PROFESSOR)) return;
        if (users.existsByEmail(email)) return; // A bootstrap account never promotes an existing student.
        try {
            validatePasswordBytes(password);
            AppUser professor = new AppUser();
            professor.setName("Professor de teste");
            professor.setEmail(email);
            professor.setPasswordHash(passwordEncoder.encode(password));
            professor.setRole(UserRole.PROFESSOR);
            users.saveAndFlush(professor);
        } catch (DataIntegrityViolationException exception) {
            // Startup remains available if another account wins a concurrent bootstrap race.
        }
    }

    private AppUser saveUnique(AppUser user) {
        try {
            return users.saveAndFlush(user);
        } catch (DataIntegrityViolationException exception) {
            throw new DuplicateEmailException();
        }
    }

    private AuthResponse issueToken(AppUser user) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(tokenTtl);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer(issuer)
                .issuedAt(now)
                .expiresAt(expiresAt)
                .subject(user.getId().toString())
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .claim("roles", List.of(user.getRole().name()))
                .build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new AuthResponse(token, "Bearer", expiresAt, UserProfileResponse.from(user));
    }

    private String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    private void validatePasswordBytes(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new BadRequestException("A senha deve ter no máximo 72 bytes em UTF-8 para o algoritmo BCrypt");
        }
    }
}
