// Spring Data JPA repository for the User entity.
// Provides standard CRUD operations automatically, plus two custom queries:
// findByEmail (used during login and JWT validation) and existsByEmail (used
// during signup to prevent duplicate accounts).

package com.neverlate.repository;

import com.neverlate.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);
}
