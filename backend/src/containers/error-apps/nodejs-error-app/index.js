const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Read error configuration from environment
const ERROR_TYPE = process.env.ERROR_TYPE || "none";
const ERROR_RATE = parseFloat(process.env.ERROR_RATE || "0");
const CRASH_AFTER = parseInt(process.env.CRASH_AFTER || "0");
const OOM_TRIGGER = process.env.OOM_TRIGGER === "true";
const CPU_INTENSIVE = process.env.CPU_INTENSIVE === "true";

let requestCount = 0;
let memoryLeak = [];

// Simulate different error types
function simulateError() {
  requestCount++;

  // Crash after N requests
  if (CRASH_AFTER > 0 && requestCount >= CRASH_AFTER) {
    console.error("💥 FATAL: Configured crash limit reached!");
    process.exit(1);
  }

  // Memory leak
  if (OOM_TRIGGER) {
    const size = 10000;
    memoryLeak.push(new Array(size).fill("LEAK"));
    if (memoryLeak.length % 10 === 0) {
      console.log(
        `⚠️  Memory leak active: ${memoryLeak.length * size} items in memory`,
      );
    }
  }

  // CPU intensive operation
  if (CPU_INTENSIVE) {
    const start = Date.now();
    let result = 0;
    for (let i = 0; i < 10000000; i++) {
      result += Math.sqrt(i);
    }
    console.log(`🔥 CPU intensive operation took ${Date.now() - start}ms`);
  }

  // Random errors based on error rate
  if (Math.random() < ERROR_RATE) {
    const errorTypes = [
      "Database connection failed: ECONNREFUSED postgres:5432",
      "Redis timeout: Connection to redis:6379 timed out after 5000ms",
      "API authentication failed: Invalid token or expired credentials",
      "File system error: EACCES permission denied /data/config.json",
      "Network timeout: Request to api.external.com timed out",
      "Out of disk space: ENOSPC no space left on device",
      'Uncaught exception: Cannot read property "data" of undefined',
    ];

    const randomError =
      errorTypes[Math.floor(Math.random() * errorTypes.length)];
    console.error(`❌ ERROR [${requestCount}]: ${randomError}`);

    if (ERROR_TYPE === "panic") {
      throw new Error(randomError);
    }
  }

  // Log based on error type
  switch (ERROR_TYPE) {
    case "connection":
      console.error(
        `❌ [${new Date().toISOString()}] Connection Error: Failed to connect to database`,
      );
      break;
    case "timeout":
      console.error(
        `❌ [${new Date().toISOString()}] Timeout Error: Request took too long to respond`,
      );
      break;
    case "auth":
      console.error(
        `❌ [${new Date().toISOString()}] Auth Error: Invalid credentials provided`,
      );
      break;
    case "validation":
      console.error(
        `❌ [${new Date().toISOString()}] Validation Error: Invalid request payload`,
      );
      break;
    case "rate-limit":
      console.error(
        `❌ [${new Date().toISOString()}] Rate Limit: Too many requests from client`,
      );
      break;
  }
}

// Health check endpoint
app.get("/health", (req, res) => {
  if (ERROR_TYPE === "unhealthy") {
    return res
      .status(500)
      .json({ status: "unhealthy", error: "Service degraded" });
  }
  res.json({ status: "healthy", uptime: process.uptime() });
});

// Readiness check
app.get("/ready", (req, res) => {
  if (ERROR_TYPE === "not-ready") {
    return res
      .status(503)
      .json({ ready: false, reason: "Dependencies not available" });
  }
  res.json({ ready: true });
});

// Main endpoint
app.get("/", (req, res) => {
  simulateError();
  res.json({
    message: "Service running",
    requests: requestCount,
    errorType: ERROR_TYPE,
    errorRate: ERROR_RATE,
  });
});

// Metrics endpoint
app.get("/metrics", (req, res) => {
  res.json({
    requests_total: requestCount,
    memory_usage: process.memoryUsage(),
    uptime: process.uptime(),
    error_type: ERROR_TYPE,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server started on port ${PORT}`);
  console.log(`📊 Configuration:`);
  console.log(`   ERROR_TYPE: ${ERROR_TYPE}`);
  console.log(`   ERROR_RATE: ${ERROR_RATE}`);
  console.log(`   CRASH_AFTER: ${CRASH_AFTER}`);
  console.log(`   OOM_TRIGGER: ${OOM_TRIGGER}`);
  console.log(`   CPU_INTENSIVE: ${CPU_INTENSIVE}`);
});

// Log periodically
setInterval(() => {
  simulateError();
  console.log(
    `📈 Status: ${requestCount} requests processed, memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
  );
}, 5000);
