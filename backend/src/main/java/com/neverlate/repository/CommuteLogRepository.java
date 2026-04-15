package com.neverlate.repository;

import com.neverlate.model.CommuteLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CommuteLogRepository extends JpaRepository<CommuteLog, Long> {
    List<CommuteLog> findByCommuteIdOrderByStartedAtDesc(Long commuteId);
    Page<CommuteLog> findByCommuteIdOrderByStartedAtDesc(Long commuteId, Pageable pageable);
}
