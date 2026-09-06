package app.memoa.auth;

import java.util.UUID;

public record AuthResponse(
    String token,
    UUID userId,
    String displayName,
    String email
) {
}
