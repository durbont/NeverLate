// REST controller for commute endpoints in NeverLate.
// All routes require a valid JWT (enforced by SecurityConfig).
// The current user's email is pulled from the JWT via Spring Security's
// authentication principal, so users can only access their own commutes.
//
// GET    /api/commutes          — returns all commutes for the logged-in user (ordered)
// POST   /api/commutes          — creates a new commute
// PUT    /api/commutes/{id}     — updates an existing commute owned by the logged-in user
// DELETE /api/commutes/{id}     — deletes a commute owned by the logged-in user
// PUT    /api/commutes/reorder  — updates the display order of the user's commutes

package com.neverlate.controller;

import com.neverlate.dto.CommuteRequest;
import com.neverlate.dto.CommuteResponse;
import com.neverlate.dto.ReorderRequest;
import com.neverlate.service.CommuteService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/commutes")
public class CommuteController {

    @Autowired
    private CommuteService commuteService;

    @GetMapping
    public ResponseEntity<List<CommuteResponse>> getCommutes(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(commuteService.getCommutesForUser(userDetails.getUsername()));
    }

    @PostMapping
    public ResponseEntity<CommuteResponse> createCommute(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CommuteRequest request) {
        CommuteResponse response = commuteService.createCommute(userDetails.getUsername(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateCommute(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody CommuteRequest request) {
        try {
            CommuteResponse response = commuteService.updateCommute(userDetails.getUsername(), id, request);
            return ResponseEntity.ok(response);
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCommute(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Long id) {
        try {
            commuteService.deleteCommute(userDetails.getUsername(), id);
            return ResponseEntity.noContent().build();
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", ex.getMessage()));
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
        }
    }

    @PutMapping("/reorder")
    public ResponseEntity<?> reorderCommutes(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody ReorderRequest request) {
        try {
            commuteService.reorderCommutes(userDetails.getUsername(), request.ids());
            return ResponseEntity.noContent().build();
        } catch (AccessDeniedException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", ex.getMessage()));
        }
    }
}
