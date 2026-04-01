package com.ratelimiter.ratelimiter.controller;

import com.ratelimiter.ratelimiter.service.RateLimiterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RateLimiterController {

    private final RateLimiterService rateLimiterService;

    @PostMapping("/config")
    public ResponseEntity<Map<String, Object>> setConfig(@RequestBody Map<String, Object> request) {
        String clientId = (String) request.get("clientId");
        int maxRequests = (int) request.get("maxRequests");
        int windowSeconds = (int) request.get("windowSeconds");

        rateLimiterService.setConfigs(clientId, maxRequests, windowSeconds);

        return ResponseEntity.ok(Map.of(
                "message", "Config set successfully",
                "clientId", clientId,
                "maxRequests", maxRequests,
                "windowSeconds", windowSeconds
        ));
    }

    @PostMapping("/ping")
    public ResponseEntity<Map<String, Object>> ping(@RequestBody Map<String, String> request) {
        String clientId  = request.get("clientId");

        boolean allowed = rateLimiterService.isAllowed(clientId);

        if(allowed) {
            return ResponseEntity.ok(Map.of(
                    "status", "ALLOWED",
                    "message", "Request processed successfully",
                    "clientId", clientId
            ));
        } else {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                    "status", "REJECTED",
                    "message", "Rate limit exceeded. Try again later",
                    "clientId", clientId
            ));
        }
    }

    @GetMapping("status/{clientId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String clientId) {
        return ResponseEntity.ok(rateLimiterService.getStatus(clientId));
    }

    @DeleteMapping("/reset/{clientId}")
    public ResponseEntity<Map<String, Object>> reset(@PathVariable String clientId) {
        rateLimiterService.reset(clientId);
        return ResponseEntity.ok(Map.of(
                "message", "Rate limiter reset successfully",
                "clientId", clientId
        ));
    }
}
