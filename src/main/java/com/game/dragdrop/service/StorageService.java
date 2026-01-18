package com.game.dragdrop.service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;

@Service
public class StorageService {
    @Value("${upload.dir:src/main/resources/static/uploads}")
    private String uploadDir;

    // Create upload directory if it doesn't exist
    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (Exception e) {
            throw new RuntimeException("Failed to create upload directory", e);
        }
    }

    public String uploadFile(MultipartFile file) {
        try {
            if (file.isEmpty()) {
                throw new RuntimeException("File is empty, cannot upload!");
            }

            // Create unique file name
            String originalFileName = file.getOriginalFilename();
            String uniqueFileName = UUID.randomUUID().toString() + "_" + originalFileName;

            // Determine the full path
            Path rootPath = Paths.get(uploadDir);
            Path filePath = rootPath.resolve(uniqueFileName);

            // Copy file to directory
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            // Return the path that the Web (Frontend) can read
            // Because the file is in static/uploads/, the URL will be /uploads/...
            return "/uploads/" + uniqueFileName;

        } catch (Exception e) {
            throw new RuntimeException("Error in the process of uploading file: " + e.getMessage());
        }
    }

    public void deleteFile(String fileUrl) {
        try {
            String fileName = fileUrl.replace("/uploads/", "");
            Path filePath = Paths.get(uploadDir).resolve(fileName);
            Files.deleteIfExists(filePath);
        } catch (Exception e) {
            throw new RuntimeException("Error in the process of deleting file: " + e.getMessage());
        }
    }
}
