package com.ratelimiter.ratelimiter.service;

import com.ratelimiter.ratelimiter.model.QueuedRequest;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Queue;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class QueueManagerService {

    private final RateLimiterService rateLimiterService;

    private final Map<String, Queue<QueuedRequest>> clientQueues = new ConcurrentHashMap<>();

    private ScheduledExecutorService scheduler;

    @PostConstruct
    public void start() {
        scheduler = Executors.newSingleThreadScheduledExecutor();
        scheduler.scheduleAtFixedRate(this::processAllQueues, 0, 500, TimeUnit.MILLISECONDS);
        log.info("QueueManagerService started - checking queues every 500 ms");
    }

    @PreDestroy
    public void stop() {
        if(scheduler != null) scheduler.shutdown();
        log.info("QueueManagerService stopped");
    }

    public CompletableFuture<String> enqueue(String clientId) {
        CompletableFuture<String> future = new CompletableFuture<>();

        QueuedRequest request = new QueuedRequest(clientId, System.currentTimeMillis(), future);

        clientQueues.computeIfAbsent(clientId, k -> new ConcurrentLinkedDeque<>()).add(request);

        log.info("Request queued for client {} - queue size: {}", clientId, clientQueues.get(clientId).size());

        return future;
    }

    public int getQueueSize(String clientId) {
        Queue<QueuedRequest> queue = clientQueues.get(clientId);
        return queue == null ? 0 : queue.size();
    }

    private void processAllQueues() {
        for(Map.Entry<String, Queue<QueuedRequest>> entry : clientQueues.entrySet()) {
            String clientId = entry.getKey();
            Queue<QueuedRequest> queue = entry.getValue();

            while(!queue.isEmpty()) {
                QueuedRequest next = queue.peek();
                if(next == null)
                    break;
                if(rateLimiterService.isAllowed(clientId)) {
                    queue.poll();
                    long waitedMs = System.currentTimeMillis() - next.getQueuedAt();
                    log.info("Processing queued request for client {} - waited {}ms", clientId, waitedMs);
                    next.getFuture().complete("PROCESSED after " + waitedMs + "ms");
                } else {
                    break;
                }
            }
        }
    }

    public void resetQueue(String clientId) {
        Queue<QueuedRequest> queue = clientQueues.remove(clientId);
        if(queue != null) {
            queue.forEach(r -> r.getFuture().complete("CANCELLED"));
        }
        log.info("Queue reset for client {}", clientId);
    }






}
