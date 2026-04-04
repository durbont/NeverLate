// Data Transfer Object for creating a new commute.
// The user provides a name, optional start/end addresses, and an optional list
// of MTA stops (line, stop, direction) they use on this commute.
// The owning user is resolved server-side from the JWT token.

package com.neverlate.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CommuteRequest(
        @NotBlank(message = "Commute name is required")
        String name,
        String startAddress,
        String endAddress,
        List<CommuteStopDto> stops
) {}
