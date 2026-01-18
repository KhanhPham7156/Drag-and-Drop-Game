package com.game.dragdrop.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
public class GamePlayer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Long roomId;

    private boolean isFinished = false;

    private int score = 0;

    private LocalDateTime joinedAt = LocalDateTime.now();

    public GamePlayer() {
    }

    public GamePlayer(String name, Long roomId) {
        this.name = name;
        this.roomId = roomId;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getRoomId() {
        return roomId;
    }

    public void setRoomId(Long roomId) {
        this.roomId = roomId;
    }

    public boolean isFinished() {
        return isFinished;
    }

    public void setFinished(boolean finished) {
        isFinished = finished;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public LocalDateTime getJoinedAt() {
        return joinedAt;
    }
}
