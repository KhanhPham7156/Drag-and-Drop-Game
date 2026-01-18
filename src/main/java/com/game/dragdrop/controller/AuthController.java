package com.game.dragdrop.controller;

import com.game.dragdrop.model.User;
import com.game.dragdrop.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public Map<String, String> register(@RequestBody User user) {
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            return Collections.singletonMap("error", "Username already exists");
        }
        user.setRole("ADMIN");
        user.setApproved(false);
        userRepository.save(user);
        return Collections.singletonMap("message", "Registration successful. Waiting for Root approval.");
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> loginRequest, HttpSession session) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        // Special Root Check
        if ("root".equals(username) && "khanh1507".equals(password)) {
            session.setAttribute("user", "root");
            session.setAttribute("role", "ROOT");
            return Map.of("success", true, "role", "ROOT", "username", "root");
        }

        User user = userRepository.findByUsername(username)
                .orElse(null);

        if (user != null && user.getPassword().equals(password)) {
            if (!user.isApproved()) {
                return Collections.singletonMap("error", "Account not yet approved by Root.");
            }
            session.setAttribute("user", user.getUsername());
            session.setAttribute("role", "ADMIN");
            return Map.of("success", true, "role", "ADMIN", "username", user.getUsername());
        }

        return Collections.singletonMap("error", "Invalid credentials");
    }

    @PostMapping("/logout")
    public Map<String, String> logout(HttpSession session) {
        session.invalidate();
        return Collections.singletonMap("message", "Logged out");
    }

    @GetMapping("/users")
    public List<User> getAllUsers(HttpSession session) {
        String role = (String) session.getAttribute("role");
        if (!"ROOT".equals(role)) {
            throw new RuntimeException("Unauthorized");
        }
        return userRepository.findAll();
    }

    @DeleteMapping("/user/{id}")
    public void deleteUser(@PathVariable Long id, HttpSession session) {
        String role = (String) session.getAttribute("role");
        if (!"ROOT".equals(role)) {
            throw new RuntimeException("Unauthorized");
        }
        userRepository.deleteById(id);
    }

    @PostMapping("/approve/{id}")
    public Map<String, String> approveUser(@PathVariable Long id, HttpSession session) {
        String role = (String) session.getAttribute("role");
        if (!"ROOT".equals(role)) {
            return Collections.singletonMap("error", "Unauthorized");
        }

        User user = userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        user.setApproved(true);
        userRepository.save(user);

        return Collections.singletonMap("message", "User approved");
    }

    @GetMapping("/me")
    public Map<String, String> getCurrentUser(HttpSession session) {
        String username = (String) session.getAttribute("user");
        String role = (String) session.getAttribute("role");
        if (username == null)
            return Collections.singletonMap("user", null);
        return Map.of("user", username, "role", role);
    }
}
