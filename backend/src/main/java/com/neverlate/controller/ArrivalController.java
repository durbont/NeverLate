// Endpoint for fetching live MTA train arrivals for a specific stop.
// Data is fetched from MTA's GTFS-RT feed by our server and filtered before
// being returned to the client — the client never contacts MTA directly.
//
// GET /api/arrivals?stopId=132&direction=N&lineIds=1,2,3

package com.neverlate.controller;

import com.neverlate.dto.ArrivalsResponse;
import com.neverlate.service.MtaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/arrivals")
public class ArrivalController {

    @Autowired
    private MtaService mtaService;

    @GetMapping
    public ResponseEntity<ArrivalsResponse> getArrivals(
            @RequestParam String stopId,
            @RequestParam String direction,
            @RequestParam String lineIds) {
        List<String> lineIdList = List.of(lineIds.split(","));
        ArrivalsResponse response = mtaService.getArrivals(stopId, direction, lineIdList);
        return ResponseEntity.ok(response);
    }
}
