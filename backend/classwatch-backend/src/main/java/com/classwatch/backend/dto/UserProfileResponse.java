package com.classwatch.backend.dto;

import com.classwatch.backend.model.AppUser;
import com.classwatch.backend.model.UserRole;

public record UserProfileResponse(Long id, String name, String email, UserRole role) {
    public static UserProfileResponse from(AppUser user) {
        return new UserProfileResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
