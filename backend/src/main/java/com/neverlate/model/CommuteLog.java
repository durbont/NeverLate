package com.neverlate.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(name = "commute_logs")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommuteLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "commute_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Commute commute;

    // Unix epoch seconds — stored as-is from the client so no timezone ambiguity
    @Column(nullable = false)
    private Long startedAt;

    @Column(nullable = false)
    private Long endedAt;

    @Column(nullable = false)
    private Long durationSeconds;
}
