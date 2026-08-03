"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationError = void 0;
exports.requireAuthority = requireAuthority;
exports.hasAuthority = hasAuthority;
exports.checkMultipleAuthorities = checkMultipleAuthorities;
class AuthorizationError extends Error {
    constructor(message, authority) {
        super(message);
        this.authority = authority;
        this.name = "AuthorizationError";
    }
}
exports.AuthorizationError = AuthorizationError;
function requireAuthority(ctx, authority) {
    if (!ctx.policy.authorities.includes(authority)) {
        throw new AuthorizationError(`Authority ${authority} not granted for studio ${ctx.studioId}`, authority);
    }
}
function hasAuthority(ctx, authority) {
    return ctx.policy.authorities.includes(authority);
}
function checkMultipleAuthorities(ctx, authorities) {
    return authorities.filter(auth => !ctx.policy.authorities.includes(auth));
}
