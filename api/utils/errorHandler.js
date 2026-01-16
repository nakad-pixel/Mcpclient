import { ERROR_CODES, HTTP_STATUS } from './constants.js';

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
