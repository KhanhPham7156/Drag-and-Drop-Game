package com.game.dragdrop.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.game.dragdrop.model.GameLevel;
import com.game.dragdrop.repository.LevelRepository;
import com.game.dragdrop.service.StorageService;

@RestController
@RequestMapping("/api/management")
public class AdminController {
    @Autowired
    private LevelRepository levelRepository;
    @Autowired
    private StorageService storageService;

    @PostMapping("/level")
    public GameLevel createLevel(@RequestParam("image") MultipartFile file, @RequestParam("answer") String answer,
            @RequestParam("hint") String hint, @RequestParam("levelOrder") Integer levelOrder,
            @RequestParam(value = "roomId", required = false) Long roomId,
            @RequestParam(value = "timeLimit", required = false) Integer timeLimit) {
        String imageUrl = storageService.uploadFile(file);
        GameLevel level = new GameLevel();
        level.setImageUrl(imageUrl);
        level.setAnswer(answer);
        level.setHint(hint);
        level.setLevelOrder(levelOrder);
        level.setRoomId(roomId);
        level.setTimeLimit(timeLimit != null ? timeLimit : 60); // Default 60s
        level.setOptions(answer.chars().mapToObj(c -> String.valueOf((char) c)).collect(Collectors.toList()));
        return levelRepository.save(level);
    }

    @DeleteMapping("/level/{id}")
    public void deleteLevel(@PathVariable Long id) {
        GameLevel level = levelRepository.findById(id).orElseThrow(() -> new RuntimeException("Level not found"));
        storageService.deleteFile(level.getImageUrl());
        levelRepository.delete(level);
    }

    @PutMapping("/level/{id}")
    public GameLevel updateLevel(@PathVariable Long id,
            @RequestParam(value = "image", required = false) MultipartFile file,
            @RequestParam("answer") String answer, @RequestParam("hint") String hint,
            @RequestParam("levelOrder") Integer levelOrder,
            @RequestParam(value = "roomId", required = false) Long roomId,
            @RequestParam(value = "timeLimit", required = false) Integer timeLimit) {
        GameLevel level = levelRepository.findById(id).orElseThrow(() -> new RuntimeException("Level not found"));

        if (file != null && !file.isEmpty()) {
            storageService.deleteFile(level.getImageUrl());
            String imageUrl = storageService.uploadFile(file);
            level.setImageUrl(imageUrl);
        }

        level.setAnswer(answer);
        level.setHint(hint);
        level.setLevelOrder(levelOrder);
        level.setRoomId(roomId);
        if (timeLimit != null)
            level.setTimeLimit(timeLimit);
        level.setOptions(answer.chars().mapToObj(c -> String.valueOf((char) c)).collect(Collectors.toList()));
        return levelRepository.save(level);
    }

    @GetMapping("/level")
    public List<GameLevel> getAllLevels(@RequestParam(value = "roomId", required = false) Long roomId) {
        if (roomId != null) {
            return levelRepository.findByRoomId(roomId);
        }
        return levelRepository.findAll();
    }

    @GetMapping("/level/{id}")
    public GameLevel getLevel(@PathVariable Long id) {
        return levelRepository.findById(id).orElseThrow(() -> new RuntimeException("Level not found"));
    }
}
