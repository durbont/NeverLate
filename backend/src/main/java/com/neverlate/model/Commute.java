// JPA entity representing a commute route created by a user.
// A commute has a name (e.g. "Home to Office") and belongs to one user.
// Each commute will accumulate trip entries over time, which are used to
// calculate timing statistics like p50, p90, and p95 arrival distributions.

package com.neverlate.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "commutes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Commute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String name;

    @Column
    private String startAddress;

    @Column
    private String endAddress;

    @OneToMany(mappedBy = "commute", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<CommuteStop> stops = new ArrayList<>();

    // Display order in the user's commute list. Null for commutes created before
    // ordering was introduced — those fall back to createdAt ordering.
    @Column
    private Integer sortOrder;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
