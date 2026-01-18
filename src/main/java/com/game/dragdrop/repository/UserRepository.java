package com.game.dragdrop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.game.dragdrop.model.User;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);

    List<User> findByIsApprovedFalse();
}
