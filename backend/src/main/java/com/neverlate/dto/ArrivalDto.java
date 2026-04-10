package com.neverlate.dto;

// A single upcoming train arrival at a stop.
// arrivalTime is a Unix epoch second from the MTA GTFS-RT feed — not modified.
// minutesAway is derived at fetch time for convenience.
public record ArrivalDto(
        String lineId,
        long arrivalTime,
        int minutesAway
) {}
