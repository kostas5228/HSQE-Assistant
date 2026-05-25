package com.hsqe.hsqe_assistant_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Centralised error mapping for all REST controllers.
 *
 * <p>Without this, validation errors thrown from the service layer (e.g.
 * {@code throw new IllegalArgumentException("pscAuthority is required ...")})
 * propagate as a generic <strong>HTTP 500 Internal Server Error</strong>,
 * which is misleading: the request body was malformed/invalid, so the
 * client should see <strong>HTTP 400 Bad Request</strong>.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(buildBody(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    private Map<String, Object> buildBody(HttpStatus status, String message) {
        // LinkedHashMap to keep response field order stable in JSON output.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", OffsetDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message != null ? message : "");
        return body;
    }
}
