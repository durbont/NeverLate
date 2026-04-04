// Service layer for commute management in NeverLate.
// Handles fetching, creating, deleting, and reordering commutes for the logged-in user.
// Sort order is persisted per-user so the list order survives page refreshes.
// All operations verify the requesting user owns the commute before acting.

package com.neverlate.service;

import com.neverlate.dto.CommuteRequest;
import com.neverlate.dto.CommuteResponse;
import com.neverlate.dto.CommuteStopDto;
import com.neverlate.model.Commute;
import com.neverlate.model.CommuteStop;
import com.neverlate.model.User;
import com.neverlate.repository.CommuteRepository;
import com.neverlate.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommuteService {

    @Autowired
    private CommuteRepository commuteRepository;

    @Autowired
    private UserRepository userRepository;

    public List<CommuteResponse> getCommutesForUser(String email) {
        User user = findUser(email);
        return commuteRepository.findByUserIdOrdered(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public CommuteResponse createCommute(String email, CommuteRequest request) {
        User user = findUser(email);
        int nextOrder = commuteRepository.findMaxSortOrderByUserId(user.getId()) + 1;

        Commute commute = Commute.builder()
                .user(user)
                .name(request.name())
                .startAddress(request.startAddress())
                .endAddress(request.endAddress())
                .sortOrder(nextOrder)
                .build();

        if (request.stops() != null) {
            for (CommuteStopDto dto : request.stops()) {
                CommuteStop stop = CommuteStop.builder()
                        .commute(commute)
                        .lineIds(new java.util.ArrayList<>(dto.lineIds()))
                        .stopId(dto.stopId())
                        .stopName(dto.stopName())
                        .direction(dto.direction())
                        .build();
                commute.getStops().add(stop);
            }
        }

        return toResponse(commuteRepository.save(commute));
    }

    @Transactional
    public void deleteCommute(String email, Long id) {
        User user = findUser(email);
        Commute commute = commuteRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Commute not found"));
        if (!commute.getUser().getId().equals(user.getId())) {
            throw new AccessDeniedException("You do not own this commute");
        }
        commuteRepository.delete(commute);
    }

    @Transactional
    public void reorderCommutes(String email, List<Long> ids) {
        User user = findUser(email);
        List<Commute> commutes = commuteRepository.findAllById(ids);

        for (Commute c : commutes) {
            if (!c.getUser().getId().equals(user.getId())) {
                throw new AccessDeniedException("You do not own this commute");
            }
        }

        for (int i = 0; i < ids.size(); i++) {
            final int order = i;
            final Long commuteId = ids.get(i);
            commutes.stream()
                    .filter(c -> c.getId().equals(commuteId))
                    .findFirst()
                    .ifPresent(c -> c.setSortOrder(order));
        }

        commuteRepository.saveAll(commutes);
    }

    private CommuteResponse toResponse(Commute commute) {
        List<CommuteStopDto> stops = commute.getStops().stream()
                .map(s -> new CommuteStopDto(s.getLineIds(), s.getStopId(), s.getStopName(), s.getDirection()))
                .toList();
        return new CommuteResponse(
                commute.getId(),
                commute.getName(),
                commute.getStartAddress(),
                commute.getEndAddress(),
                stops,
                commute.getCreatedAt()
        );
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));
    }
}
