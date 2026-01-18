/**
 * LLM API Routes - Handle API key management
 */

import { globalSessionManager } from '../utils/sessionManager.js';
import { readJsonBody } from '../utils/request.js';

export async function handleLLMRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method;

    try {
        if (method === 'POST' && path === '/api/llm/key') {
            // Save an LLM API key
            const body = await readJsonBody(req);
            const { serviceName, apiKey } = body;
            
            if (!serviceName || !apiKey) {
                return res.status(400).json({ error: 'Service name and API key required' });
            }

            globalSessionManager.setLLMKey(serviceName, apiKey);
            
            return res.status(200).json({
                success: true,
                message: `API key for "${serviceName}" saved successfully`,
                service: serviceName
            });
        }

        if (method === 'DELETE' && path === '/api/llm/key') {
            // Remove an LLM API key
            const body = await readJsonBody(req);
            const { serviceName } = body;
            
            if (!serviceName) {
                return res.status(400).json({ error: 'Service name required' });
            }

            globalSessionManager.removeLLMKey(serviceName);
            
            return res.status(200).json({
                success: true,
                message: `API key for "${serviceName}" removed`,
                service: serviceName
            });
        }

        if (method === 'GET' && path === '/api/llm/services') {
            // Get list of configured LLM services (metadata only, no keys)
            const services = globalSessionManager.getAllLLMServices();
            
            return res.status(200).json({
                success: true,
                services: services,
                count: services.length
            });
        }

        if (method === 'GET' && path === '/api/llm/key') {
            // Get a specific LLM API key (only for internal use)
            const serviceName = url.searchParams.get('service');
            
            if (!serviceName) {
                return res.status(400).json({ error: 'Service name required' });
            }

            const apiKey = globalSessionManager.getLLMKey(serviceName);
            
            if (!apiKey) {
                return res.status(404).json({ error: `No API key found for "${serviceName}"` });
            }

            return res.status(200).json({
                success: true,
                service: serviceName,
                apiKey: apiKey  // Only returned to verified backend calls
            });
        }

        return res.status(404).json({ error: 'Endpoint not found' });

    } catch (err) {
        console.error('LLM Route Error:', err);
        return res.status(500).json({
            error: 'Internal server error',
            message: err.message
        });
    }
}