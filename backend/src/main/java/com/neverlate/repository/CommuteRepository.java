// Spring Data JPA repository for the Commute entity.
// Provides standard CRUD operations plus custom queries for ordered fetching,
// max sort order lookup (used when creating a commute to place it at the bottom),
// and a count query used to initialize sort order for new users.

package com.neverlate.repository;

import com.neverlate.model.Commute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommuteRepository extends JpaRepository<Commute, Long> {

    // Orders by sortOrder first (nulls last), then falls back to createdAt descending.
    @Query("SELECT c FROM Commute c WHERE c.user.id = :userId " +
           "ORDER BY COALESCE(c.sortOrder, 2147483647) ASC, c.createdAt DESC")
    List<Commute> findByUserIdOrdered(@Param("userId") Long userId);

    @Query("SELECT COALESCE(MAX(c.sortOrder), -1) FROM Commute c WHERE c.user.id = :userId")
    int findMaxSortOrderByUserId(@Param("userId") Long userId);
}
