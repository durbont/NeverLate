// Data Transfer Object for the signup request body.
// Carries the email and password submitted by the user. Jakarta validation
// annotations ensure the email is well-formed and neither field is blank
// before the request reaches the service layer.

package com.neverlate.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SignupRequest(
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be a valid email address")
        String email,

        @NotBlank(message = "Password is required")
        String password
) {}
