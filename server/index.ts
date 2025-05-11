import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cookieParser from "cookie-parser";
import { initializeWebSocketServer, setWebSocketServer } from "./websocket";
import { optimizeStartup, isSystemReady } from "./startup-optimizer";
import { systemLog } from "./system-logs";
import userPreferencesRoutes from "./routes/userPreferencesRoutes";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Register user preferences routes
app.use('/api', userPreferencesRoutes);

// System readiness middleware
app.use((req, res, next) => {
  // Allow health checks and static resources during startup
  if (req.path === '/health' || 
      req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  
  // If system isn't ready yet, return a 503 for API requests
  if (!isSystemReady() && req.path.startsWith('/api/')) {
    return res.status(503).json({
      error: 'System starting up',
      message: 'The system is still initializing. Please try again in a few seconds.'
    });
  }
  
  next();
});

// Register health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: isSystemReady() ? 'ready' : 'starting',
    timestamp: new Date().toISOString()
  });
});

// Set CORS headers to ensure cookies and auth work correctly
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Initialize WebSocket server
  const wss = initializeWebSocketServer(server);
  setWebSocketServer(wss);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`, 'express');
    
    // Log system startup in the system logs
    systemLog.info('Server started successfully', 'startup');
    
    // Start optimized service initialization in parallel
    optimizeStartup().catch((error) => {
      log(`Startup optimization error: ${error}`, 'express');
    });
  });
})();
