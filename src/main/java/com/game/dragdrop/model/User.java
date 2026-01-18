package com.game.dragdrop.model;

import jakarta.persistence.*;

@Entity
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String role = "ADMIN"; // Default to ADMIN if null, though usually set explicitly

    private Boolean isApproved = false; // Default false

    // private String roleName; // Helper if needed, but let's stick to 'role'
    // string in DB

    public User() {
    }

    public User(String username, String password, String role, Boolean isApproved) {
        this.username = username;
        this.password = password;
        this.role = role;
        this.isApproved = isApproved;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Boolean isApproved() {
        return isApproved;
    }

    public void setApproved(Boolean approved) {
        isApproved = approved;
    }
}
