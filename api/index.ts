// Vercel serverless function entry point
import express, { type Request, Response } from "express";
import { registerRoutes } from "./routes";
import path from "path";

const app = express();

// Configure Express for Vercel
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Trust proxy for Vercel
app.set('trust proxy', true);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY'); 
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// API request logging for Vercel
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Initialize routes
let routesInitialized = false;
let routePromise: Promise<any> | null = null;

const initializeRoutes = async () => {
  if (!routesInitialized && !routePromise) {
    routePromise = registerRoutes(app);
    await routePromise;
    routesInitialized = true;
  } else if (routePromise) {
    await routePromise;
  }
};

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: any) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error('Vercel Function Error:', {
    status,
    message,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  res.status(status).json({ message });
});

// Export handler for Vercel
export default async (req: Request, res: Response) => {
  try {
    await initializeRoutes();
    return app(req, res);
  } catch (error) {
    console.error('Failed to initialize routes:', error);
    res.status(500).json({ message: 'Server initialization failed' });
  }
};
