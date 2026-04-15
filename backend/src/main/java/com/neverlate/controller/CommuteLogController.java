package com.neverlate.controller;

import com.neverlate.model.Commute;
import com.neverlate.model.CommuteLog;
import com.neverlate.repository.CommuteLogRepository;
import com.neverlate.repository.CommuteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/commutes")
public class CommuteLogController {

    @Autowired private CommuteRepository commuteRepository;
    @Autowired private CommuteLogRepository commuteLogRepository;

    @GetMapping("/{commuteId}/stats")
    public ResponseEntity<?> getStats(
            @PathVariable Long commuteId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        Commute commute = commuteRepository.findById(commuteId).orElse(null);
        if (commute == null || !commute.getUser().getEmail().equals(email)) {
            return ResponseEntity.notFound().build();
        }

        List<com.neverlate.model.CommuteLog> all =
                commuteLogRepository.findByCommuteIdOrderByStartedAtDesc(commuteId);

        if (all.isEmpty()) {
            return ResponseEntity.ok(Map.of("count", 0));
        }

        List<Long> durations = all.stream()
                .map(com.neverlate.model.CommuteLog::getDurationSeconds)
                .sorted()
                .collect(Collectors.toList());

        int n = durations.size();
        double mean = durations.stream().mapToLong(Long::longValue).average().orElse(0);
        double variance = durations.stream()
                .mapToDouble(d -> Math.pow(d - mean, 2))
                .average().orElse(0);
        double stddev = Math.sqrt(variance);

        long p75 = durations.get((int) Math.ceil(0.75 * n) - 1);
        long p90 = durations.get((int) Math.ceil(0.90 * n) - 1);
        long sixSigma = Math.round(mean + 6 * stddev);

        return ResponseEntity.ok(Map.of(
                "count", n,
                "meanSeconds", Math.round(mean),
                "p75Seconds", p75,
                "p90Seconds", p90,
                "sixSigmaSeconds", sixSigma
        ));
    }

    @DeleteMapping("/{commuteId}/logs/{logId}")
    public ResponseEntity<?> deleteLog(
            @PathVariable Long commuteId,
            @PathVariable Long logId,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        Commute commute = commuteRepository.findById(commuteId).orElse(null);
        if (commute == null || !commute.getUser().getEmail().equals(email)) {
            return ResponseEntity.notFound().build();
        }

        com.neverlate.model.CommuteLog log = commuteLogRepository.findById(logId).orElse(null);
        if (log == null || !log.getCommute().getId().equals(commuteId)) {
            return ResponseEntity.notFound().build();
        }

        commuteLogRepository.delete(log);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{commuteId}/logs")
    public ResponseEntity<?> getLogs(
            @PathVariable Long commuteId,
            @RequestParam(defaultValue = "0") int page,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();
        Commute commute = commuteRepository.findById(commuteId).orElse(null);
        if (commute == null || !commute.getUser().getEmail().equals(email)) {
            return ResponseEntity.notFound().build();
        }

        Page<com.neverlate.model.CommuteLog> results = commuteLogRepository
                .findByCommuteIdOrderByStartedAtDesc(commuteId, PageRequest.of(page, 10));

        List<Map<String, Object>> items = results.getContent().stream()
                .map(log -> Map.<String, Object>of(
                        "id", log.getId(),
                        "startedAt", log.getStartedAt(),
                        "endedAt", log.getEndedAt(),
                        "durationSeconds", log.getDurationSeconds()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Map.of(
                "logs", items,
                "page", results.getNumber(),
                "totalPages", results.getTotalPages(),
                "hasMore", !results.isLast()
        ));
    }

    @PostMapping("/{commuteId}/logs")
    public ResponseEntity<?> saveLog(
            @PathVariable Long commuteId,
            @RequestBody Map<String, Long> body,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        String email = userDetails.getUsername();

        Commute commute = commuteRepository.findById(commuteId).orElse(null);
        if (commute == null || !commute.getUser().getEmail().equals(email)) {
            return ResponseEntity.notFound().build();
        }

        long startedAt = body.get("startedAt");
        long endedAt = body.get("endedAt");
        long duration = endedAt - startedAt;

        CommuteLog log = CommuteLog.builder()
                .commute(commute)
                .startedAt(startedAt)
                .endedAt(endedAt)
                .durationSeconds(duration)
                .build();

        CommuteLog saved = commuteLogRepository.save(log);

        return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "commuteId", commuteId,
                "startedAt", saved.getStartedAt(),
                "endedAt", saved.getEndedAt(),
                "durationSeconds", saved.getDurationSeconds()
        ));
    }
}
