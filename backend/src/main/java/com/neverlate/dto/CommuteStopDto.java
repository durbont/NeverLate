// DTO for a single monitored train at a stop associated with a commute.
// Each entry represents one line at one physical stop in one direction.
// Stops with the same stopId are grouped together on the frontend.

package com.neverlate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CommuteStopDto(
        @NotBlank String lineId,
        @NotBlank String stopId,
        @NotBlank String stopName,
        @NotBlank @Pattern(regexp = "N|S", message = "Direction must be N or S") String direction
) {}
