package com.game.dragdrop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.game.dragdrop.model.GamePlayer;
import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<GamePlayer, Long> {
    List<GamePlayer> findByRoomId(Long roomId);

    Optional<GamePlayer> findByRoomIdAndName(Long roomId, String name);

    boolean existsByRoomIdAndIsFinishedFalse(Long roomId);
}
