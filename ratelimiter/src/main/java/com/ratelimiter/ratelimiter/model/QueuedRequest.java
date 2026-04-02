package com.ratelimiter.ratelimiter.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.concurrent.CompletableFuture;

@Data
@AllArgsConstructor
public class QueuedRequest {
    private String clientId;
    private long queuedAt;
    private CompletableFuture<String> future;
}
