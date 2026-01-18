package com.game.dragdrop.controller;

import com.game.dragdrop.model.GameRoom;
import com.game.dragdrop.model.GamePlayer;
import com.game.dragdrop.repository.RoomRepository;
import com.game.dragdrop.repository.PlayerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Collections;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PlayerRepository playerRepository;

    @PostMapping("/create")
    public GameRoom createRoom(@RequestParam String name) {
        GameRoom room = new GameRoom();
        room.setName(name);
        room.setCreatedAt(LocalDateTime.now());
        room.setActive(true);
        room.setStatus("WAITING");
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

    // --- GAME FLOW LOGIC ---

    @PostMapping("/{id}/start")
    public void startGame(@PathVariable Long id) {
        GameRoom room = roomRepository.findById(id).orElseThrow();
        room.setStatus("PLAYING");
        roomRepository.save(room);
    }

    @GetMapping("/{id}/status")
    public Map<String, String> getRoomStatus(@PathVariable Long id) {
        GameRoom room = roomRepository.findById(id).orElseThrow();
        String status = room.getStatus();
        return Collections.singletonMap("status", status != null ? status : "WAITING");
    }

    @PostMapping("/{id}/join")
    public Map<String, Object> joinRoom(@PathVariable Long id, @RequestParam String playerName) {
        GameRoom room = roomRepository.findById(id).orElseThrow(() -> new RuntimeException("Room not found"));

        String status = room.getStatus();
        if (status == null)
            status = "WAITING";

        if ("PLAYING".equals(status) || "FINISHED".equals(status)) {
            return Collections.singletonMap("error", "Room is already playing or finished");
        }

        GamePlayer player = playerRepository.findByRoomIdAndName(id, playerName)
                .orElseGet(() -> {
                    GamePlayer newPlayer = new GamePlayer(playerName, id);
                    return playerRepository.save(newPlayer);
                });

        return Map.of("playerId", player.getId(), "status", status);
    }

    @PostMapping("/{id}/finish")
    public void finishGame(@PathVariable("id") Long roomId, @RequestParam Long playerId,
            @RequestParam(defaultValue = "0") int score) {
        GamePlayer player = playerRepository.findById(playerId).orElseThrow();
        player.setFinished(true);
        player.setScore(score);
        playerRepository.save(player);

        // Check if all players finished
        boolean anyoneStillPlaying = playerRepository.existsByRoomIdAndIsFinishedFalse(roomId);
        if (!anyoneStillPlaying) {
            GameRoom room = roomRepository.findById(roomId).orElseThrow();
            room.setStatus("FINISHED");
            room.setStatus("FINISHED");
            roomRepository.save(room);
        }
    }

    @GetMapping("/{id}/players")
    public List<GamePlayer> getPlayers(@PathVariable Long id) {
        return playerRepository.findByRoomId(id);
    }
}
