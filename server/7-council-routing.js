/**
 * Council Routing Handler - GET /api/council
 * Provides council routing information and model management
 */

import { corsMiddleware, sendSuccess, sendError, ERROR_CODES, HTTP_STATUS } from './9-core-utils.js';

export default async function handler(req, res) {
    if (corsMiddleware(req, res)) return;

    // For now, return information about available council endpoints
    if (req.method === 'GET') {
        return sendSuccess(res, {
            message: 'Council API available',
            endpoints: {
                consensus: 'POST /api/council/consensus'
            },
            models: [
                'OpenRouter GPT-4',
                'OpenRouter Claude',
                'OpenRouter GPT-3.5',
                'OpenRouter Llama'
            ]
        });
    }

    return sendError(
        res,
        ERROR_CODES.INVALID_REQUEST,
        'Method not allowed',
        HTTP_STATUS.BAD_REQUEST
    );
}