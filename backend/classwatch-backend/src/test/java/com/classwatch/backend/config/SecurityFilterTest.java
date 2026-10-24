package com.classwatch.backend.config;

import jakarta.servlet.Filter;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.mock.web.MockServletContext;
import org.springframework.test.context.support.TestPropertySourceUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import tools.jackson.databind.json.JsonMapper;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class SecurityFilterTest {
    private static final String SECRET = "unit-test-secret-with-at-least-32-bytes";

    @Configuration
    static class SecurityOnlyConfiguration {
        @Bean JsonMapper jsonMapper() { return JsonMapper.builder().build(); }
    }

    @RestController
    static class SecureProbeController {
        @GetMapping("/secure-probe") String probe() { return "ok"; }
    }

    @Test
    void filterRetorna401SemTokenEAceitaTokenAssinadoValido() throws Exception {
        try (var context = new AnnotationConfigWebApplicationContext()) {
            context.setServletContext(new MockServletContext());
            TestPropertySourceUtils.addInlinedPropertiesToEnvironment(context,
                    "classwatch.security.jwt-secret=" + SECRET,
                    "classwatch.security.jwt-issuer=classwatch-test");
            context.register(SecurityConfig.class, SecurityOnlyConfiguration.class);
            context.refresh();

            Filter filter = context.getBean(FilterChainProxy.class);
            MockMvc mvc = MockMvcBuilders.standaloneSetup(new SecureProbeController())
                    .addFilters(filter).build();
            mvc.perform(get("/secure-probe")).andExpect(status().isUnauthorized());

            JwtEncoder encoder = context.getBean(JwtEncoder.class);
            Instant now = Instant.now();
            String token = encoder.encode(JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder().issuer("classwatch-test").subject("17")
                            .issuedAt(now).expiresAt(now.plusSeconds(300)).build())).getTokenValue();
            mvc.perform(get("/secure-probe").header("Authorization", "Bearer " + token))
                    .andExpect(status().isOk());
        }
    }
}
