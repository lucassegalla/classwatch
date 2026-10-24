package com.classwatch.backend.dto;

import java.time.Instant;

public record AuthResponse(String accessToken, String tokenType, Instant expiresAt, UserProfileResponse user) {}
