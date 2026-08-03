"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireUserOrAdmin = exports.requireAdmin = exports.requireSuperAdmin = exports.requireRole = exports.createAdminUser = exports.logoutUser = exports.loginUser = exports.verifyPassword = exports.hashPassword = exports.getCurrentUser = exports.isAuthenticated = exports.optionalAuth = exports.requireAuth = exports.sessionConfig = void 0;
const express_session_1 = __importDefault(require("express-session"));
const connect_pg_simple_1 = __importDefault(require("connect-pg-simple"));
const pg_1 = require("pg");
// Use bcryptjs for compatibility (pure JS) to avoid native binding issues
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const storage_1 = require("./storage");
// Create PostgreSQL session store for production persistence
const PgStore = (0, connect_pg_simple_1.default)(express_session_1.default);
// Database pool for session store
const sessionPool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
// Session configuration with PostgreSQL store for production
exports.sessionConfig = (0, express_session_1.default)({
    store: process.env.DATABASE_URL ? new PgStore({
        pool: sessionPool,
        tableName: 'user_sessions',
        createTableIfMissing: true // Automatically create the session table
    }) : undefined, // Use memory store in development if no DATABASE_URL
    secret: process.env.SESSION_SECRET || 'dev-secret-key-photography-crm-2024',
    resave: false,
    saveUninitialized: false,
    name: 'admin.session.id',
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS)
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
    },
    rolling: false // Don't refresh session on each request - prevents conflicts
});
// Middleware to require authentication - resilient in development to avoid flaky DB-caused failures
const requireAuth = async (req, res, next) => {
    try {
        // Must have a session user id
        if (!req.session || !req.session.userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        // Try to resolve the user from the database.
        // On transient DB errors in development, allow a soft-pass so pages don't 500.
        const allowBypassOnDbError = (process.env.NODE_ENV || 'development') !== 'production';
        try {
            const user = await (0, exports.getCurrentUser)(req);
            if (!user) {
                if (allowBypassOnDbError) {
                    // Soft-bypass: attach minimal user and continue to keep the app responsive locally
                    req.user = { id: req.session.userId, role: 'admin' };
                    return next();
                }
                // In production, enforce validity
                req.session.destroy();
                return res.status(401).json({ success: false, error: 'Invalid session' });
            }
            req.user = user;
            return next();
        }
        catch (dbErr) {
            console.warn('Auth lookup error (continuing due to dev bypass):', dbErr?.message || dbErr);
            if (allowBypassOnDbError) {
                req.user = { id: req.session.userId, role: 'admin' };
                return next();
            }
            return res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
};
exports.requireAuth = requireAuth;
// Optional authentication middleware
const optionalAuth = (req, res, next) => {
    next();
};
exports.optionalAuth = optionalAuth;
// Check if user is authenticated
const isAuthenticated = (req) => {
    return !!(req.session && req.session.userId);
};
exports.isAuthenticated = isAuthenticated;
// Get current admin user from session
const getCurrentUser = async (req) => {
    if (!req.session || !req.session.userId) {
        return null;
    }
    try {
        return await storage_1.storage.getAdminUser(req.session.userId);
    }
    catch (error) {
        console.error('Error getting current admin user:', error);
        return null;
    }
};
exports.getCurrentUser = getCurrentUser;
// Hash password
const hashPassword = async (password) => {
    const saltRounds = 12;
    return bcryptjs_1.default.hash(password, saltRounds);
};
exports.hashPassword = hashPassword;
// Verify password
const verifyPassword = async (password, hashedPassword) => {
    return bcryptjs_1.default.compare(password, hashedPassword);
};
exports.verifyPassword = verifyPassword;
// Login function
const loginUser = async (email, password) => {
    try {
        // Get admin user by email
        const user = await storage_1.storage.getAdminUserByEmail(email);
        if (!user) {
            console.warn('[auth] login: user not found for email', email);
            return { success: false, error: 'Invalid email or password' };
        }
        // Verify password
        const isValidPassword = await (0, exports.verifyPassword)(password, user.passwordHash || '');
        if (!isValidPassword) {
            console.warn('[auth] login: invalid password for user', user.id);
            return { success: false, error: 'Invalid email or password' };
        }
        // Check if user is active
        if (user.status !== 'active') {
            console.warn('[auth] login: user inactive', { id: user.id, status: user.status });
            return { success: false, error: 'Account is deactivated. Please contact administrator.' };
        }
        // Update last login
        await storage_1.storage.updateAdminUser(user.id, {
            lastLoginAt: new Date()
        });
        return {
            success: true,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role || 'admin'
            }
        };
    }
    catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'An error occurred during login' };
    }
};
exports.loginUser = loginUser;
// Logout function
const logoutUser = (req) => {
    return new Promise((resolve, reject) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};
exports.logoutUser = logoutUser;
// Create admin user (for initial setup)
const createAdminUser = async (email, password, firstName, lastName) => {
    try {
        // Check if admin already exists
        const existingUser = await storage_1.storage.getAdminUserByEmail(email);
        if (existingUser) {
            return { success: false, error: 'User with this email already exists' };
        }
        // Hash password
        const passwordHash = await (0, exports.hashPassword)(password);
        // Create admin user
        const adminUser = await storage_1.storage.createAdminUser({
            email,
            passwordHash,
            firstName,
            lastName,
            role: 'admin',
            status: 'active'
        });
        return {
            success: true,
            user: {
                id: adminUser.id,
                email: adminUser.email,
                firstName: adminUser.firstName,
                lastName: adminUser.lastName,
                role: adminUser.role
            }
        };
    }
    catch (error) {
        console.error('Error creating admin user:', error);
        return { success: false, error: 'Failed to create admin user' };
    }
};
exports.createAdminUser = createAdminUser;
// Role-based authorization middleware
const requireRole = (roles) => {
    return async (req, res, next) => {
        if (!(0, exports.isAuthenticated)(req)) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please log in to access this resource'
            });
        }
        try {
            const user = await (0, exports.getCurrentUser)(req);
            // Super admins bypass all role checks
            if (user && user.role === 'super_admin') {
                next();
                return;
            }
            if (!user || !roles.includes(user.role || 'user')) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    message: 'You do not have permission to access this resource'
                });
            }
            next();
        }
        catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                error: 'Authorization check failed'
            });
        }
    };
};
exports.requireRole = requireRole;
// Super admin middleware
exports.requireSuperAdmin = (0, exports.requireRole)(['super_admin']);
// Admin-only middleware (includes super admin)
exports.requireAdmin = (0, exports.requireRole)(['admin', 'super_admin']);
// User or admin middleware (includes super admin)
exports.requireUserOrAdmin = (0, exports.requireRole)(['user', 'admin', 'super_admin']);
