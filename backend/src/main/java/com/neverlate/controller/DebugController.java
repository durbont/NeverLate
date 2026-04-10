package com.neverlate.controller;

import com.google.transit.realtime.GtfsRealtime.*;
import com.neverlate.service.MtaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/debug")
public class DebugController {

    @Autowired
    private MtaService mtaService;

    // GET /api/debug/stops?line=6           — all stop IDs for a line
    // GET /api/debug/stop?stopId=421N       — which routes stop at a specific stop ID
    @GetMapping("/stops")
    public Map<String, Object> debugStops(@RequestParam String line) throws Exception {
        FeedMessage feed = mtaService.fetchFeedPublic(line);
        Set<String> allRouteIds = new TreeSet<>();
        Set<String> stopIds = new TreeSet<>();
        List<String> sampleTrips = new ArrayList<>();

        for (FeedEntity entity : feed.getEntityList()) {
            if (!entity.hasTripUpdate()) continue;
            TripUpdate tu = entity.getTripUpdate();
            String routeId = tu.getTrip().getRouteId();
            allRouteIds.add(routeId.isEmpty() ? "(empty)" : routeId);

            if (!line.equals(routeId)) continue;

            for (TripUpdate.StopTimeUpdate stu : tu.getStopTimeUpdateList()) {
                stopIds.add(stu.getStopId());
            }

            if (sampleTrips.size() < 2) {
                List<String> stops = new ArrayList<>();
                for (TripUpdate.StopTimeUpdate stu : tu.getStopTimeUpdateList()) {
                    stops.add(stu.getStopId());
                }
                sampleTrips.add("routeId=" + routeId + " stops=" + stops);
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("line", line);
        result.put("totalEntities", feed.getEntityCount());
        result.put("allRouteIds", allRouteIds);
        result.put("allStopIdsForLine", new TreeSet<>(stopIds.stream()
                .filter(s -> s.startsWith(line) || true) // show all
                .collect(java.util.stream.Collectors.toSet())));
        result.put("sampleTrips", sampleTrips);
        return result;
    }

    @GetMapping("/stop")
    public Map<String, Object> debugStop(@RequestParam String stopId) throws Exception {
        // Search the 1-7/S feed since that covers 4/5/6
        FeedMessage feed = mtaService.fetchFeedPublic("6");
        List<String> matches = new ArrayList<>();

        for (FeedEntity entity : feed.getEntityList()) {
            if (!entity.hasTripUpdate()) continue;
            TripUpdate tu = entity.getTripUpdate();
            for (TripUpdate.StopTimeUpdate stu : tu.getStopTimeUpdateList()) {
                if (stu.getStopId().equals(stopId)) {
                    long time = stu.hasArrival() ? stu.getArrival().getTime()
                              : stu.hasDeparture() ? stu.getDeparture().getTime() : 0;
                    matches.add("route=" + tu.getTrip().getRouteId()
                            + " time=" + time
                            + " trip=" + tu.getTrip().getTripId());
                }
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("stopId", stopId);
        result.put("matchingTrips", matches);
        return result;
    }
}
