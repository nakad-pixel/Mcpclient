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
