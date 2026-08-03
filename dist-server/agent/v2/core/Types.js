"use strict";
/**
 * Core types for Agent V2 ToolBus architecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.AuthzError = exports.ConfirmRequiredError = void 0;
/**
 * Confirmation requirement thrown by guardrails
 */
class ConfirmRequiredError extends Error {
    constructor(tool, args, reason) {
        super("CONFIRM_REQUIRED");
        this.tool = tool;
        this.args = args;
        this.reason = reason;
        this.name = "ConfirmRequiredError";
    }
}
exports.ConfirmRequiredError = ConfirmRequiredError;
/**
 * Authorization failure
 */
class AuthzError extends Error {
    constructor(tool, requiredScopes, userScopes) {
        super(`Missing required scopes: ${requiredScopes.join(", ")}`);
        this.tool = tool;
        this.requiredScopes = requiredScopes;
        this.userScopes = userScopes;
        this.name = "AuthzError";
    }
}
exports.AuthzError = AuthzError;
/**
 * Validation error from Zod schema
 */
class ValidationError extends Error {
    constructor(tool, zodError) {
        super(`Validation failed: ${zodError.message}`);
        this.tool = tool;
        this.zodError = zodError;
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
