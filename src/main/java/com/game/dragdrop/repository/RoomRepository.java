package com.game.dragdrop.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.game.dragdrop.model.GameRoom;

public interface RoomRepository extends JpaRepository<GameRoom, Long> {
}
