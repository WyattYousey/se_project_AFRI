import analyzeHandler from '../../src/api/analyze.js';

/**
 * Netlify Function for AFRI API
 * Wraps the analyze handler for serverless execution
 *
 * Triggered by: POST /api/analyze
 */
export default async function handler(event) {
    // Convert Netlify event to Node.js request-like object
    const req = {
        method: event.httpMethod,
        url: event.path,
        headers: event.headers,
        body: event.body ? JSON.parse(event.body) : {},
        connection: {
            remoteAddress:
                event.requestContext?.identity?.sourceIp || 'unknown',
        },
    };

    // Create response object
    let statusCode = 200;
    let responseBody = {};
    const responseHeaders = {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    const res = {
        status: (code) => {
            statusCode = code;
            return res;
        },
        setHeader: (key, value) => {
            responseHeaders[key] = value;
            return res;
        },
        json: (data) => {
            responseBody = data;
            return res;
        },
        end: (data) => {
            if (data) responseBody = data;
            return res;
        },
        headersSent: false,
    };

    try {
        // Call the analyze handler
        await analyzeHandler(req, res);
    } catch (error) {
        console.error('Netlify function error:', error);
        statusCode = 500;
        responseBody = { error: 'Internal server error' };
    }

    return {
        statusCode,
        headers: responseHeaders,
        body: JSON.stringify(responseBody),
    };
}

export const config = {
    path: '/api/analyze',
};
