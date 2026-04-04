// DTO for an MTA stop associated with a commute.
// lineIds holds one or more subway line IDs to monitor at this physical stop
// (e.g., ["1", "2", "3"] for a shared platform). Used in both requests and responses.

package com.neverlate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;

import java.util.List;

public record CommuteStopDto(
        @NotEmpty List<String> lineIds,
        @NotBlank String stopId,
        @NotBlank String stopName,
        @NotBlank @Pattern(regexp = "N|S", message = "Direction must be N or S") String direction
) {}
