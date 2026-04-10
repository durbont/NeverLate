package com.neverlate.dto;

import java.util.List;

// Response wrapper for the arrivals endpoint.
// fetchedAt: Unix epoch second when our server fetched from MTA.
// feedTimestamp: Unix epoch second from the MTA FeedHeader — used by the frontend
//   to detect if the MTA feed itself is stale (T&C requirement: warn if lag > 1 min).
public record ArrivalsResponse(
        List<ArrivalDto> arrivals,
        long fetchedAt,
        long feedTimestamp
) {}
