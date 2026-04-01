package com.ratelimiter.ratelimiter.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class RateLimiterService {
    private final Map<String, Deque<Long>> requestWindows = new ConcurrentHashMap<>();

    private final Map<String, long[]> clientConfigs = new ConcurrentHashMap<>();

    private static final int Default_MAX_REQUEST = 10;
    private static final int DEFAULT_WINDOW_SECONDS = 60;

    public void setConfigs(String clientId, int maxRequest, int windowSeconds) {
        clientConfigs.put(clientId, new long[]{maxRequest, windowSeconds});
        log.info("Configs set for client {}: {} requests per {}s", clientId, maxRequest, windowSeconds);
    }

    public synchronized boolean isAllowed(String clientId) {
        long now = Instant.now().toEpochMilli();
        long[] config = clientConfigs.getOrDefault(clientId, new long[]{Default_MAX_REQUEST, DEFAULT_WINDOW_SECONDS*1000L});
        long maxRequests = config[0];
        long windowMillis = config[1] * 1000L;

        requestWindows.putIfAbsent(clientId, new ArrayDeque<>());
        Deque<Long> timestamps = requestWindows.get(clientId);

        while(!timestamps.isEmpty() && timestamps.peekFirst() <= now - windowMillis) {
            timestamps.pollFirst();
        }

        log.info("Client {} - request in window: {}/{}", clientId, timestamps.size(), maxRequests);

        if(timestamps.size() < maxRequests) {
            timestamps.addLast(now);
            return true;
        }

        return false;
    }

    public Map<String, Object> getStatus(String clientId) {
        long now = Instant.now().toEpochMilli();
        long[] config = clientConfigs.getOrDefault(clientId, new long[]{Default_MAX_REQUEST, DEFAULT_WINDOW_SECONDS * 1000L});

        long maxRequest = config[0];
        long windowMillis = config[1] * 1000L;

        Deque<Long> timestamps = requestWindows.getOrDefault(clientId, new ArrayDeque<>());

        while(!timestamps.isEmpty() && timestamps.peekFirst() <= now - windowMillis) {
            timestamps.pollFirst();
        }

        long used = timestamps.size();
        long remaining = Math.max(0, maxRequest - used);

        long resetInMs = timestamps.isEmpty() ? 0: (timestamps.peekFirst() + windowMillis) - now;

        return Map.of(
                "clientId", clientId,
                "maxRequest", maxRequest,
                "windowSeconds", config[1],
                "used", used,
                "remaining", remaining,
                "resentInMs", Math.max(0, resetInMs)
        );
    }

    public void reset(String clientId) {
        requestWindows.remove(clientId);
        log.info("Reset rate limiter for client {}", clientId);
    }

}
