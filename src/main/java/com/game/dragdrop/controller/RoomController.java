package com.game.dragdrop.controller;

import com.game.dragdrop.model.GameRoom;
import com.game.dragdrop.repository.RoomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomRepository roomRepository;

    @PostMapping("/create")
    public GameRoom createRoom(@RequestParam String name) {
        GameRoom room = new GameRoom();
        room.setName(name);
        room.setCreatedAt(LocalDateTime.now());
        room.setActive(true);
        return roomRepository.save(room);
    }

    @GetMapping("/all")
    public List<GameRoom> getAllRooms() {
        return roomRepository.findAll();
    }

    @DeleteMapping("/{id}")
    public void deleteRoom(@PathVariable Long id) {
        roomRepository.deleteById(id);
    }
}
