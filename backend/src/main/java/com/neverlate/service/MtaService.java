// Fetches and parses MTA GTFS-RT protobuf feeds.
// Each subway line belongs to one feed endpoint. This service resolves which
// feed(s) to call for a given set of lineIds, fetches them from MTA's server
// (data is NOT streamed directly to the client — it is stored in memory here
// and filtered before being forwarded, per MTA Terms and Conditions), and
// returns filtered upcoming arrivals for the requested stop and direction.
//
// Data is obtained from MTA and redistributed via our own server.
// Arrival times are not modified — only filtered and sorted.

package com.neverlate.service;

import com.google.transit.realtime.GtfsRealtime.FeedMessage;
import com.google.transit.realtime.GtfsRealtime.FeedEntity;
import com.google.transit.realtime.GtfsRealtime.TripUpdate;
import com.neverlate.dto.ArrivalDto;
import com.neverlate.dto.ArrivalsResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MtaService {

    private static final Logger log = LoggerFactory.getLogger(MtaService.class);

    private static final String BASE_URL =
            "https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/nyct%2F";

    // Maps each subway line ID to its GTFS-RT feed name
    private static final Map<String, String> LINE_TO_FEED = Map.ofEntries(
            Map.entry("1",   "gtfs"),
            Map.entry("2",   "gtfs"),
            Map.entry("3",   "gtfs"),
            Map.entry("4",   "gtfs"),
            Map.entry("5",   "gtfs"),
            Map.entry("6",   "gtfs"),
            Map.entry("7",   "gtfs"),
            Map.entry("S",   "gtfs"),
            Map.entry("A",   "gtfs-ace"),
            Map.entry("C",   "gtfs-ace"),
            Map.entry("E",   "gtfs-ace"),
            Map.entry("B",   "gtfs-bdfm"),
            Map.entry("D",   "gtfs-bdfm"),
            Map.entry("F",   "gtfs-bdfm"),
            Map.entry("M",   "gtfs-bdfm"),
            Map.entry("G",   "gtfs-g"),
            Map.entry("J",   "gtfs-jz"),
            Map.entry("Z",   "gtfs-jz"),
            Map.entry("L",   "gtfs-l"),
            Map.entry("N",   "gtfs-nqrw"),
            Map.entry("Q",   "gtfs-nqrw"),
            Map.entry("R",   "gtfs-nqrw"),
            Map.entry("W",   "gtfs-nqrw"),
            Map.entry("SI",  "gtfs-si"),
            Map.entry("SIR", "gtfs-si")
    );

    public ArrivalsResponse getArrivals(String stopId, String direction, List<String> lineIds) {
        long now = Instant.now().getEpochSecond();

        // Deduplicate feeds needed for the requested lines
        Set<String> feeds = lineIds.stream()
                .map(LINE_TO_FEED::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        Set<String> lineIdSet = new HashSet<>(lineIds);
        // GTFS-RT NYC stop IDs append direction: e.g. "132N" or "132S"
        String fullStopId = stopId + direction;

        List<ArrivalDto> arrivals = new ArrayList<>();
        long feedTimestamp = now; // fallback to now; overwritten by actual feed header

        for (String feed : feeds) {
            try {
                FeedMessage message = fetchFeed(feed);
                feedTimestamp = message.getHeader().getTimestamp();

                for (FeedEntity entity : message.getEntityList()) {
                    if (!entity.hasTripUpdate()) continue;
                    TripUpdate tu = entity.getTripUpdate();
                    String routeId = tu.getTrip().getRouteId();
                    if (!lineIdSet.contains(routeId)) continue;

                    for (TripUpdate.StopTimeUpdate stu : tu.getStopTimeUpdateList()) {
                        if (!fullStopId.equals(stu.getStopId())) continue;

                        long arrivalTime = stu.hasArrival()
                                ? stu.getArrival().getTime()
                                : (stu.hasDeparture() ? stu.getDeparture().getTime() : 0);

                        if (arrivalTime <= now) continue; // train already left

                        int minutesAway = (int) ((arrivalTime - now) / 60);
                        if (minutesAway > 90) continue; // cap at 90 min lookahead

                        arrivals.add(new ArrivalDto(routeId, arrivalTime, minutesAway));
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to fetch MTA feed '{}': {}", feed, e.getMessage());
            }
        }

        arrivals.sort(Comparator.comparingLong(ArrivalDto::arrivalTime));
        List<ArrivalDto> top = arrivals.stream().limit(10).collect(Collectors.toList());

        return new ArrivalsResponse(top, now, feedTimestamp);
    }

    public FeedMessage fetchFeedPublic(String lineId) throws Exception {
        String feedName = LINE_TO_FEED.get(lineId);
        if (feedName == null) throw new IllegalArgumentException("Unknown line: " + lineId);
        return fetchFeed(feedName);
    }

    private FeedMessage fetchFeed(String feedName) throws Exception {
        URL url = new URL(BASE_URL + feedName);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setConnectTimeout(6000);
        conn.setReadTimeout(12000);
        try (InputStream in = conn.getInputStream()) {
            return FeedMessage.parseFrom(in);
        }
    }
}
