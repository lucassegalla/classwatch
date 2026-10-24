package com.classwatch.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinSubjectRequest(@NotBlank @Size(max = 10) String codigoIngresso) {}
