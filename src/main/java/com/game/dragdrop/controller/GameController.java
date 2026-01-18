package com.game.dragdrop.controller;

import java.util.Collections;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.game.dragdrop.model.GameLevel;
import com.game.dragdrop.repository.LevelRepository;

@RestController
@RequestMapping("/api/game")
public class GameController {

    @Autowired
    private LevelRepository levelRepository;

    @GetMapping("/level/{order}")
    public GameLevel getLevel(@PathVariable Integer order) {
        GameLevel level = levelRepository.findByLevelOrder(order)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy màn chơi số: " + order));

        Collections.shuffle(level.getOptions());

        return level;
    }


    @GetMapping("/levels")
    public List<GameLevel> getAllLevels() {
        return levelRepository.findAll();
    }
}
