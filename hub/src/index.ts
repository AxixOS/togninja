import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import cors from 'cors';
import apiRoutes from './routes/api';
import { deploymentService } from './services/deployment.service';

const app = express();
const PORT = process.env.PORT || 3100;

// ==================== MIDDLEWARE ====================

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5000',
    'https://workingnewage-*.vercel.app'
  ],
  credentials: true
}));

// Parse JSON for all routes EXCEPT Stripe webhooks
app.use((req, res, next) => {
  if (req.path === '/api/webhooks/stripe') {
    // Keep raw body for Stripe signature verification
    express.raw({ type: 'application/json' })(req, res, next);
  } else {
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'smarttog-hub-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ==================== ROUTES ====================

app.use('/api', apiRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'SmartTog Hub',
    description: 'Control plane for TogNinja workspace orchestration',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      webhooks: 'POST /api/webhooks/stripe',
      license: 'POST /api/license/validate',
      workspace: 'GET /api/workspace/:slug',
      onboarding: 'POST /api/workspace/:workspaceId/onboarding/progress',
      deployment: 'POST /api/deployment/:workspaceId/trigger'
    }
  });
});

// ==================== ERROR HANDLING ====================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// ==================== JOB PROCESSOR ====================

let jobProcessorInterval: NodeJS.Timeout | null = null;
const JOB_PROCESSOR_INTERVAL_MS = 30 * 1000; // 30 seconds

function startJobProcessor() {
  if (jobProcessorInterval) return;
  
  console.log('[JobProcessor] Starting background job processor...');
  
  // Initial run
  deploymentService.processPendingJobs().catch(err => {
    console.error('[JobProcessor] Initial run error:', err);
  });
  
  // Schedule recurring runs
  jobProcessorInterval = setInterval(async () => {
    try {
      await deploymentService.processPendingJobs();
    } catch (error) {
      console.error('[JobProcessor] Error:', error);
    }
  }, JOB_PROCESSOR_INTERVAL_MS);
}

function stopJobProcessor() {
  if (jobProcessorInterval) {
    clearInterval(jobProcessorInterval);
    jobProcessorInterval = null;
    console.log('[JobProcessor] Stopped');
  }
}

// ==================== SERVER STARTUP ====================

async function start() {
  try {
    console.log('='.repeat(60));
    console.log('  SmartTog Hub - Control Plane Server');
    console.log('='.repeat(60));
    
    // Validate required environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
      console.warn(`[Warning] Missing environment variables: ${missing.join(', ')}`);
      console.warn('Some features may not work correctly.');
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(60));
    });
    
    // Start job processor
    startJobProcessor();
    
    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);
      
      stopJobProcessor();
      
      server.close(() => {
        console.log('[Server] HTTP server closed');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.log('[Server] Forcing shutdown...');
        process.exit(1);
      }, 10000);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Start if running directly
if (require.main === module) {
  start();
}

export { app, start };
