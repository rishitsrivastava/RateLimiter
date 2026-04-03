package com.ratelimiter.ratelimiter.controller;

import com.ratelimiter.ratelimiter.service.QueueManagerService;
import com.ratelimiter.ratelimiter.service.RateLimiterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RateLimiterController {

    private final RateLimiterService rateLimiterService;
    private final QueueManagerService queueManagerService;

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
    public CompletableFuture<ResponseEntity<Map<String, Object>>> ping(@RequestBody Map<String, String> request) {
        String clientId  = request.get("clientId");
        String mode = request.getOrDefault("mode", "REJECT");

        boolean allowed = rateLimiterService.isAllowed(clientId);

        if(allowed) {
            return CompletableFuture.completedFuture(
                    ResponseEntity.ok(Map.of(
                        "status", "ALLOWED",
                        "message", "Request processed successfully",
                        "clientId", clientId,
                        "mode", mode
                    ))
            );
        }

        if ("QUEUE".equalsIgnoreCase(mode)) {
            int queueSize = queueManagerService.getQueueSize(clientId);

            return queueManagerService.enqueue(clientId)
                    .thenApply(result -> ResponseEntity.ok(
                            Map.of(
                                    "status", "QUEUED_AND_PROCESSED",
                                    "message", result,
                                    "clientId", clientId,
                                    "mode", mode,
                                    "queuePositionWas", queueSize + 1
                            )
                    ));
        }

        return CompletableFuture.completedFuture(
                ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
                        Map.of(
                                "status", "REJECTED",
                                "message", "Rate Limit exceeded. Try again later",
                                "clientId", clientId,
                                "mode", mode
                        )
                )
        );
    }

    @GetMapping("status/{clientId}")
    public ResponseEntity<Map<String, Object>> getStatus(@PathVariable String clientId) {
        Map<String, Object> status = rateLimiterService.getStatus(clientId);
        Map<String, Object> fullStatus = new java.util.HashMap<>(status);
        fullStatus.put("queued", queueManagerService.getQueueSize(clientId));
        return ResponseEntity.ok(fullStatus);
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
