// JPA entity representing one departure stop associated with a commute.
// A stop has a physical location (stopId, stopName, direction) plus a list of
// subway lines the user wants to monitor there — e.g., the 1, 2, and 3 trains
// all serve the same platform, so all three can be tracked in a single stop entry.
// lineIds maps to MTA GTFS route_ids, used to filter the live arrival feed.

package com.neverlate.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "commute_stops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommuteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commute_id", nullable = false)
    private Commute commute;

    // One or more subway line IDs to monitor at this stop (e.g., ["1", "2", "3"])
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "commute_stop_lines", joinColumns = @JoinColumn(name = "commute_stop_id"))
    @Column(name = "line_id", nullable = false)
    @Builder.Default
    private List<String> lineIds = new ArrayList<>();

    // MTA GTFS stop_id for the physical station (e.g., "132") — used to query live arrivals
    @Column(nullable = false)
    private String stopId;

    // Human-readable stop name (e.g., "14 St")
    @Column(nullable = false)
    private String stopName;

    // Direction of travel: "N" (northbound/uptown) or "S" (southbound/downtown)
    @Column(nullable = false)
    private String direction;
}
