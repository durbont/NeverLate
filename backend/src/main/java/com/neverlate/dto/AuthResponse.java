// Data Transfer Object returned after a successful login or signup.
// Contains the JWT token (used to authenticate future requests) and the
// user's email so the frontend can display or store it without decoding the token.

package com.neverlate.dto;

public record AuthResponse(
        String token,
        String email
) {}
