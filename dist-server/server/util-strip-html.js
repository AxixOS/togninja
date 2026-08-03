"use strict";
/**
 * Utility to sanitize HTML content for blog posts
 * Removes dangerous elements and attributes while preserving formatting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.stripDangerousHtml = stripDangerousHtml;
exports.generateUniqueSlug = generateUniqueSlug;
exports.cleanSlug = cleanSlug;
function stripDangerousHtml(html) {
    // Remove script tags and their content
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    // Remove iframe tags and their content
    html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    // Remove object and embed tags
    html = html.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');
    // Remove all event handlers (onclick, onload, etc.)
    html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    html = html.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');
    // Remove javascript: protocol from href and src attributes
    html = html.replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '');
    html = html.replace(/(href|src)\s*=\s*javascript:[^>\s]*/gi, '');
    // Remove data: protocol from src attributes (except images)
    html = html.replace(/src\s*=\s*["']data:(?!image\/)[^"']*["']/gi, '');
    // Remove style attributes with potentially dangerous content
    html = html.replace(/style\s*=\s*["'][^"']*expression[^"']*["']/gi, '');
    html = html.replace(/style\s*=\s*["'][^"']*javascript[^"']*["']/gi, '');
    // Ensure external links have proper attributes
    html = html.replace(/<a\s+([^>]*href\s*=\s*["']https?:\/\/[^"']*["'][^>]*)>/gi, (match, attributes) => {
        // Add rel="noopener" if not present
        if (!attributes.includes('rel=')) {
            return `<a ${attributes} rel="noopener">`;
        }
        else if (!attributes.includes('noopener')) {
            return match.replace(/rel\s*=\s*["']([^"']*)["']/, 'rel="$1 noopener"');
        }
        return match;
    });
    return html.trim();
}
/**
 * Generate a unique slug by checking against existing slugs
 */
function generateUniqueSlug(baseSlug, existingSlugs) {
    let slug = baseSlug;
    let counter = 1;
    while (existingSlugs.includes(slug)) {
        counter++;
        slug = `${baseSlug}-${counter}`;
    }
    return slug;
}
/**
 * Validate and clean a slug
 */
function cleanSlug(input) {
    return input
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}
