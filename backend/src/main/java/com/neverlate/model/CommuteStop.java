// JPA entity representing one monitored train at a specific stop in a commute.
// Each entry tracks a single subway line at one physical stop and direction.
// Multiple entries with the same stopId are grouped together in the UI.

package com.neverlate.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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

    // The subway line ID to monitor (e.g., "4", "L", "A")
    @Column(name = "line_id", nullable = false)
    private String lineId;

    // MTA GTFS stop_id for the physical station (e.g., "626") — used to query live arrivals
    @Column(nullable = false)
    private String stopId;

    // Human-readable stop name (e.g., "Grand Central–42 St")
    @Column(nullable = false)
    private String stopName;

    // Direction of travel: "N" (northbound/uptown) or "S" (southbound/downtown)
    @Column(nullable = false)
    private String direction;
}
