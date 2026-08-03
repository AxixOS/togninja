"use strict";
/**
 * SmartTog Hub Integration Layer for TogNinja
 *
 * This module handles communication between TogNinja (data plane)
 * and SmartTog Hub (control plane).
 *
 * Key responsibilities:
 * - License validation on startup
 * - Onboarding progress reporting
 * - Setup mode detection and enforcement
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubIntegration = void 0;
exports.licenseMiddleware = licenseMiddleware;
exports.setupModeMiddleware = setupModeMiddleware;
const node_fetch_1 = __importDefault(require("node-fetch"));
// Environment variables set by SmartTog Hub during deployment
const HUB_URL = process.env.SMARTTOG_HUB_URL || 'https://hub.smarttog.com';
const LICENSE_KEY = process.env.SMARTTOG_LICENSE_KEY;
const WORKSPACE_ID = process.env.SMARTTOG_WORKSPACE_ID;
const UPDATE_CHANNEL = process.env.UPDATE_CHANNEL || 'stable';
const SETUP_MODE = process.env.SETUP_MODE === 'true';
class HubIntegration {
    constructor() {
        this.isValidated = false;
        this.licenseData = null;
        this.workspaceData = null;
        this.onboardingData = null;
        this.lastValidation = null;
        // Cache duration for license validation (1 hour)
        this.VALIDATION_CACHE_MS = 60 * 60 * 1000;
    }
    /**
     * Check if Hub integration is configured
     */
    isConfigured() {
        return !!(HUB_URL && LICENSE_KEY && WORKSPACE_ID);
    }
    /**
     * Check if we're in setup mode (onboarding not complete)
     */
    isSetupMode() {
        return SETUP_MODE;
    }
    /**
     * Get the current onboarding step
     */
    getOnboardingStep() {
        return this.onboardingData?.step || null;
    }
    /**
     * Get the current onboarding progress percentage
     */
    getOnboardingProgress() {
        return this.onboardingData?.progressPct || 0;
    }
    /**
     * Get license tier
     */
    getLicenseTier() {
        return this.licenseData?.tier || null;
    }
    /**
     * Check if a feature is enabled for the current license
     */
    hasFeature(featureName) {
        return this.licenseData?.features?.[featureName] === true;
    }
    /**
     * Validate the license with SmartTog Hub
     * @param force - Force validation even if cached
     */
    async validateLicense(force = false) {
        // Return cached result if still valid
        if (!force && this.isValidated && this.lastValidation) {
            const age = Date.now() - this.lastValidation.getTime();
            if (age < this.VALIDATION_CACHE_MS) {
                return {
                    valid: true,
                    license: this.licenseData,
                    workspace: this.workspaceData,
                    onboarding: this.onboardingData
                };
            }
        }
        if (!this.isConfigured()) {
            console.log('[HubIntegration] Not configured - running in standalone mode');
            return { valid: true }; // Allow standalone operation
        }
        try {
            console.log('[HubIntegration] Validating license with Hub...');
            const response = await (0, node_fetch_1.default)(`${HUB_URL}/api/license/validate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ licenseKey: LICENSE_KEY })
            });
            const result = await response.json();
            if (result.valid) {
                this.isValidated = true;
                this.licenseData = result.license || null;
                this.workspaceData = result.workspace || null;
                this.onboardingData = result.onboarding || null;
                this.lastValidation = new Date();
                console.log(`[HubIntegration] License valid - Tier: ${this.licenseData?.tier}, Status: ${this.licenseData?.status}`);
            }
            else {
                this.isValidated = false;
                console.error('[HubIntegration] License validation failed:', result.error);
            }
            return result;
        }
        catch (error) {
            console.error('[HubIntegration] Failed to contact Hub:', error);
            // If we had a previous valid validation, allow continued operation
            if (this.isValidated && this.lastValidation) {
                console.log('[HubIntegration] Using cached validation (Hub unreachable)');
                return {
                    valid: true,
                    license: this.licenseData,
                    workspace: this.workspaceData,
                    onboarding: this.onboardingData
                };
            }
            // Allow standalone operation if Hub is unreachable and never validated
            return { valid: true };
        }
    }
    /**
     * Report onboarding progress to SmartTog Hub
     */
    async reportProgress(step, stats) {
        if (!this.isConfigured()) {
            return true; // Silently succeed in standalone mode
        }
        try {
            const response = await (0, node_fetch_1.default)(`${HUB_URL}/api/workspace/${WORKSPACE_ID}/onboarding/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    licenseKey: LICENSE_KEY,
                    step,
                    stats
                })
            });
            const result = await response.json();
            if (result.success) {
                // Update local state
                this.onboardingData = {
                    step,
                    progressPct: stats?.progressPct || this.onboardingData?.progressPct || 0
                };
                console.log(`[HubIntegration] Progress reported: ${step}`);
                return true;
            }
            console.error('[HubIntegration] Failed to report progress:', result.error);
            return false;
        }
        catch (error) {
            console.error('[HubIntegration] Error reporting progress:', error);
            return false;
        }
    }
    /**
     * Mark onboarding as complete
     */
    async completeOnboarding() {
        return this.reportProgress('ready', { progressPct: 100 });
    }
    /**
     * Get feature flags for the current license tier
     */
    getFeatureFlags() {
        const tier = this.licenseData?.tier || 'starter';
        // Default feature flags by tier
        const tierFeatures = {
            starter: {
                emailMarketing: true,
                basicAnalytics: true,
                socialProof: false,
                aiSuggestions: false,
                whiteLabel: false,
                prioritySupport: false
            },
            pro: {
                emailMarketing: true,
                basicAnalytics: true,
                socialProof: true,
                aiSuggestions: true,
                whiteLabel: false,
                prioritySupport: false
            },
            studio: {
                emailMarketing: true,
                basicAnalytics: true,
                socialProof: true,
                aiSuggestions: true,
                whiteLabel: true,
                prioritySupport: true
            }
        };
        // Merge tier defaults with license-specific features
        return {
            ...(tierFeatures[tier] || tierFeatures.starter),
            ...(this.licenseData?.features || {})
        };
    }
}
// Singleton instance
exports.hubIntegration = new HubIntegration();
/**
 * Express middleware to validate license on each request
 * Only validates periodically, not on every request
 */
function licenseMiddleware() {
    return async (req, res, next) => {
        // Skip validation for health checks and static assets
        if (req.path === '/health' || req.path.startsWith('/assets/')) {
            return next();
        }
        // Only validate once per cache period
        const result = await exports.hubIntegration.validateLicense();
        if (!result.valid) {
            return res.status(403).json({
                error: 'License validation failed',
                message: 'Please contact support to resolve your license issue.'
            });
        }
        // Attach license info to request for use in handlers
        req.license = result.license;
        req.workspace = result.workspace;
        req.onboarding = result.onboarding;
        next();
    };
}
/**
 * Express middleware to enforce setup mode restrictions
 * Blocks access to certain routes until onboarding is complete
 */
function setupModeMiddleware() {
    const ALLOWED_DURING_SETUP = [
        '/api/setup',
        '/api/health',
        '/api/auth',
        '/setup',
        '/login',
        '/assets'
    ];
    return (req, res, next) => {
        if (!exports.hubIntegration.isSetupMode()) {
            return next();
        }
        // Check if path is allowed during setup
        const isAllowed = ALLOWED_DURING_SETUP.some(path => req.path.startsWith(path));
        if (isAllowed) {
            return next();
        }
        // Redirect to setup wizard
        if (req.accepts('html')) {
            return res.redirect('/setup');
        }
        return res.status(403).json({
            error: 'Setup required',
            message: 'Please complete the setup wizard first.',
            redirectTo: '/setup'
        });
    };
}
exports.default = exports.hubIntegration;
