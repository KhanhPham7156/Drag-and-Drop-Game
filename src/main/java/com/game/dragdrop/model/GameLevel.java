package com.game.dragdrop.model;

import java.util.List;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import jakarta.persistence.*;

@Entity // JPA Entity
@Data // Lombok Data  
@NoArgsConstructor // Lombok NoArgsConstructor
@AllArgsConstructor // Lombok AllArgsConstructor
public class GameLevel {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String imageUrl;

    @Column(nullable = false)
    private String answer;

    private String hint;

    private Integer levelOrder;

    @ElementCollection
    @CollectionTable(name = "level_options", joinColumns = @JoinColumn(name = "level_id"))
    @Column(name = "option_text")
    private List<String> options;
}
