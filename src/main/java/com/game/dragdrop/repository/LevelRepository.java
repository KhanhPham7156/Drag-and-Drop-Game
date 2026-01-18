package com.game.dragdrop.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.game.dragdrop.model.GameLevel;

public interface LevelRepository extends JpaRepository<GameLevel, Long> {
    Optional<GameLevel> findByLevelOrder(Integer levelOrder);

    java.util.List<GameLevel> findByRoomId(Long roomId);
}
