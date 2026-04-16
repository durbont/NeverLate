package com.neverlate.dto;

// A single upcoming train arrival at a stop.
// arrivalTime is a Unix epoch second from the MTA GTFS-RT feed — not modified.
// minutesAway is derived at fetch time for convenience.
// destinationStopId is the last stop_id in the trip's StopTimeUpdate list,
// reflecting the actual current terminus (may differ from the static terminal
// during special service).
public record ArrivalDto(
        String lineId,
        long arrivalTime,
        int minutesAway,
        String destinationStopId
) {}
