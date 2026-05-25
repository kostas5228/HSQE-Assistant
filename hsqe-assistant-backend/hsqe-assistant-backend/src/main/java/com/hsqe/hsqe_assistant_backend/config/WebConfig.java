package com.hsqe.hsqe_assistant_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * CORS configuration so the React dev server (and any future deployed
 * frontend) can call the API directly without browser preflight rejections.
 *
 * <p>The allowed origins default to the Vite dev/preview servers. In
 * production you should set CORS_ALLOWED_ORIGINS (comma-separated) to the
 * real frontend URL(s), e.g.
 * <code>CORS_ALLOWED_ORIGINS=https://hsqe.example.com</code>.
 */
@Configuration
public class WebConfig {

    /**
     * Comma-separated list of origins allowed to call /api/**.
     * Default value covers Vite's dev and preview ports.
     */
    @Value("${app.cors.allowed-origins:${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173}}")
    private String allowedOrigins;

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        final String[] origins = allowedOrigins.split("\\s*,\\s*");
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(origins)
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
