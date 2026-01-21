/**
 * Consolidated Utilities - Error handling, CORS, constants, and request helpers
 * This file consolidates the utility functions into a single serverless function
 */

// Constants
export const ERROR_CODES = {
    INVALID_REQUEST: 'INVALID_REQUEST',
    SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
    MCP_ERROR: 'MCP_ERROR',
    TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
    TOOL_VALIDATION_ERROR: 'TOOL_VALIDATION_ERROR',
    CORS_ERROR: 'CORS_ERROR',
    TIMEOUT: 'TIMEOUT',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};

export const HTTP_STATUS = {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
    BAD_GATEWAY: 502,
    GATEWAY_TIMEOUT: 504
};

export const TIMEOUTS = {
    MCP_CALL: 30000,
    SESSION_EXPIRY: 3600000
};

// Error handling
export function sendSuccess(res, data, status = HTTP_STATUS.OK) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, data }));
}

export function sendError(res, code, message, status, details) {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(
        JSON.stringify({
            success: false,
            error: {
                code,
                message,
                ...(details ? { details } : {})
            }
        })
    );
}

export function toErrorDetails(err) {
    if (!err) return undefined;

    return {
        name: err.name,
        message: err.message
    };
}

export function handleUnknownError(res, err) {
    sendError(
        res,
        ERROR_CODES.INTERNAL_ERROR,
        'An unexpected error occurred',
        HTTP_STATUS.INTERNAL_ERROR,
        process.env.NODE_ENV === 'production' ? undefined : toErrorDetails(err)
    );
}

// CORS middleware
export function corsMiddleware(req, res) {
    const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ].filter(Boolean);

    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return true;
    }

    return false;
}

// Request helpers
export async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    if (chunks.length === 0) return {};

    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};

    try {
        return JSON.parse(raw);
    } catch {
        const err = new Error('Invalid JSON body');
        err.code = 'INVALID_JSON';
        throw err;
    }
}

export function isValidHttpUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:' || u.protocol === 'http:';
    } catch {
        return false;
    }
}

export function isHttpsUrl(url) {
    try {
        const u = new URL(url);
        return u.protocol === 'https:';
    } catch {
        return false;
    }
}

export function isLocalhostUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    } catch {
        return false;
    }
}