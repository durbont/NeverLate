// Data Transfer Object returned when listing or creating commutes.
// Returns only the fields the frontend needs — the full Commute entity
// is not exposed directly so internal fields like user stay server-side.

package com.neverlate.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CommuteResponse(
        Long id,
        String name,
        String startAddress,
        String endAddress,
        List<CommuteStopDto> stops,
        LocalDateTime createdAt
) {}
