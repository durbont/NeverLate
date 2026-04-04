// Data Transfer Object for the login request body.
// Carries the email and password submitted by the user on the login form.

package com.neverlate.dto;

public record LoginRequest(
        String email,
        String password
) {}
