package com.game.dragdrop.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${upload.dir:src/main/resources/static/uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Chuyển đường dẫn tương đối thành tuyệt đối URI
        Path path = Paths.get(uploadDir);
        String absolutePath = path.toAbsolutePath().toUri().toString();

        // Cấu hình: Nếu URL bắt đầu bằng /uploads/ thì tìm trong thư mục uploads trên
        // máy
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(absolutePath);
    }
}