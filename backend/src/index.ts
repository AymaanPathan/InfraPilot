import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response } from "express";
import cors from "cors";
import aiRouter from "./routes/ai.routes";
import logger from "./utils/logger";

// Load environment variables from .env file
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info("Incoming request", {
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

// ============================================
// ROUTES
// ============================================

// Mount AI routes
app.use("/api/ai", aiRouter);
// ============================================
// HEALTH & STATUS ENDPOINTS
// ============================================

app.get("/health", (req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "kubectl-api",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/status", (req: Request, res: Response) => {
  res.json({
    ok: true,
    version: "1.0.0",
    features: {
      planning: !!process.env.GROQ_API_KEY,
      kubernetes: true,
    },
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    ok: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: any) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: err.stack,
    path: req.path,
  });

  res.status(500).json({
    ok: false,
    error: "Internal server error",
    message: err.message,
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  logger.info("Server started", { port: PORT });
  console.log(`✓ Server started on port ${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/health`);
  console.log(`✓ API endpoints:`);
  console.log(`  - GET  /health (server health)`);
  console.log(`  - GET  /api/status (service status)`);
  console.log(`\n✓ AI endpoints:`);
  console.log(`  - POST /api/ai/command (natural language commands)`);
  console.log(`  - GET  /api/ai/tools (list available tools)`);
  console.log(`  - GET  /api/ai/suggestions (get command suggestions)`);
  console.log(`  - GET  /api/ai/health (AI services health)`);
  console.log(`  - POST /api/ai/validate (validate plan without executing)`);
  console.log(`  - POST /api/ai/preview-ui (preview UI for mock data)`);
});

export default app;
