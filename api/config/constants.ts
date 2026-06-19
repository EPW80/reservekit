// Centralized tunables. Prefer importing these over scattering magic numbers.

// Image upload
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Auth
export const JWT_EXPIRY = "8h";
export const JWT_SECRET_MIN_LENGTH = 32;

// Request body
export const JSON_BODY_LIMIT = "10kb";

// Rate limiting
export const GLOBAL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const GLOBAL_RATE_LIMIT_MAX = 300; // per window per IP
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const AUTH_RATE_LIMIT_MAX = 10; // login attempts per window per IP
