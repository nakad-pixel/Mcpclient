/**
 * Council Router Handler - Reserved for future council routing
 * Currently redirects to consensus handler
 */

import { corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    // For now, return information about available council endpoints
    if (req.method === 'GET') {
        return sendSuccess(res, {
            message: 'Council API available',
            endpoints: {
                consensus: 'POST /api/council/consensus'
            }
        });
    }

    return sendError(
        res,
        ERROR_CODES.INVALID_REQUEST,
        'Method not allowed',
        HTTP_STATUS.BAD_REQUEST
    );
}