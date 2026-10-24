package com.classwatch.backend.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtException;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class SecurityConfigTest {
    private final SecurityConfig config = new SecurityConfig();
    private final String secret = "unit-test-secret-with-at-least-32-bytes";
    private final String issuer = "classwatch-test";

    @Test
    void decoderAceitaTokenAssinadoPeloEmissorConfigurado() {
        var key = config.jwtSecretKey(secret);
        var token = config.jwtEncoder(key).encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder().issuer(issuer).subject("17")
                        .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build()));

        assertEquals("17", config.jwtDecoder(key, issuer).decode(token.getTokenValue()).getSubject());
    }

    @Test
    void decoderRejeitaTokenExpiradoOuAssinaturaInvalida() {
        var key = config.jwtSecretKey(secret);
        Instant expired = Instant.now().minusSeconds(120);
        var token = config.jwtEncoder(key).encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder().issuer(issuer).subject("17")
                        .issuedAt(expired.minusSeconds(60)).expiresAt(expired).build()));

        assertThrows(JwtException.class, () -> config.jwtDecoder(key, issuer).decode(token.getTokenValue()));
        assertThrows(JwtException.class, () -> config.jwtDecoder(key, issuer).decode("not-a-jwt"));
    }

    @Test
    void rejeitaSegredoCurto() {
        assertThrows(IllegalStateException.class, () -> config.jwtSecretKey("curto"));
    }
}
