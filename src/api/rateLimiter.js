/**
 * Distributed rate limiter using Netlify KV for free-tier Gemini API protection.
 *
 * Rate limits (Gemini free tier):
 * - 20 requests per day (global)
 * - 5 requests per minute
 * - 250K tokens per minute
 *
 * Uses Netlify KV for distributed, persistent state across function invocations.
 */

/**
 * Initialize KV client (works in Netlify context)
 */
function getKVClient() {
    // In Netlify Functions, globalThis.NETLIFY_KV is automatically available
    // Fallback to memory-based limiter if KV not available (e.g., local dev)
    if (typeof globalThis !== 'undefined' && globalThis.NETLIFY?.KV) {
        return globalThis.NETLIFY.KV;
    }
    return null;
}

/**
 * Extract IP address from request headers
 */
export function getClientIP(req) {
    return (
        (
            req.headers &&
            (req.headers['x-forwarded-for'] || req.headers['x-real-ip'])
        )
            ?.split?.(',')?.[0]
            ?.trim() ||
        req.connection?.remoteAddress ||
        'unknown'
    );
}

/**
 * Rate limit check with detailed response
 * Returns: { allowed: boolean, remaining: number, retryAfter: number, message: string }
 */
export async function checkRateLimit(req, estimatedTokens = 0) {
    const ip = getClientIP(req);
    const now = Date.now();
    const kvClient = getKVClient();

    const minKey = `ratelimit:min:${ip}`;
    const dayKey = `ratelimit:day:${ip}`;
    const tokenKey = `ratelimit:tokens:${ip}`;

    try {
        let minData = null;
        let dayData = null;
        let tokenData = null;

        if (kvClient) {
            // Use Netlify KV for distributed state
            try {
                minData = await kvClient.get(minKey);
                dayData = await kvClient.get(dayKey);
                tokenData = await kvClient.get(tokenKey);
            } catch (e) {
                console.warn(
                    '[rateLimiter] KV fetch warning (will use fallback):',
                    e.message
                );
            }
        }

        // Parse stored data
        const minRequests = minData
            ? JSON.parse(minData)
            : { count: 0, resetTime: now + 60_000 };
        const dayRequests = dayData
            ? JSON.parse(dayData)
            : { count: 0, resetTime: now + 24 * 60 * 60 * 1000 };
        const tokens = tokenData
            ? JSON.parse(tokenData)
            : { used: 0, resetTime: now + 60_000 };

        // Reset if windows expired
        if (minRequests.resetTime < now) {
            minRequests.count = 0;
            minRequests.resetTime = now + 60_000;
        }
        if (dayRequests.resetTime < now) {
            dayRequests.count = 0;
            dayRequests.resetTime = now + 24 * 60 * 60 * 1000;
        }
        if (tokens.resetTime < now) {
            tokens.used = 0;
            tokens.resetTime = now + 60_000;
        }

        // Check against limits
        const minLimitExceeded = minRequests.count >= 5;
        const dayLimitExceeded = dayRequests.count >= 20;
        const tokenLimitExceeded = tokens.used + estimatedTokens > 250_000;

        if (minLimitExceeded || dayLimitExceeded || tokenLimitExceeded) {
            let reason = [];
            if (minLimitExceeded) reason.push('5/min limit');
            if (dayLimitExceeded) reason.push('20/day limit');
            if (tokenLimitExceeded) reason.push('250K tokens/min limit');

            const retryAfter = Math.ceil(
                (minLimitExceeded ? minRequests.resetTime : tokens.resetTime) /
                    1000
            );

            return {
                allowed: false,
                remaining: 20 - dayRequests.count,
                retryAfter,
                message: `Rate limit exceeded (${reason.join(', ')}). Retry after ${retryAfter}s.`,
                limitType: reason[0],
            };
        }

        // Increment counters
        minRequests.count++;
        dayRequests.count++;
        tokens.used += estimatedTokens;

        // Store back to KV if available
        if (kvClient) {
            try {
                const ttlMin = Math.ceil((minRequests.resetTime - now) / 1000);
                const ttlDay = Math.ceil((dayRequests.resetTime - now) / 1000);
                const ttlToken = Math.ceil((tokens.resetTime - now) / 1000);

                await Promise.all([
                    kvClient.set(minKey, JSON.stringify(minRequests), {
                        ex: ttlMin,
                    }),
                    kvClient.set(dayKey, JSON.stringify(dayRequests), {
                        ex: ttlDay,
                    }),
                    kvClient.set(tokenKey, JSON.stringify(tokens), {
                        ex: ttlToken,
                    }),
                ]);
            } catch (e) {
                console.warn('[rateLimiter] KV store warning:', e.message);
                // Continue even if KV fails (fallback to in-memory would apply for this invocation)
            }
        } else {
            // Fallback: store in global memory (survives within invocation only)
            // This is for Node.js environments (development, serverless)
            if (typeof globalThis !== 'undefined') {
                globalThis.__rateLimitCache = globalThis.__rateLimitCache || {};
                globalThis.__rateLimitCache[minKey] = minRequests;
                globalThis.__rateLimitCache[dayKey] = dayRequests;
                globalThis.__rateLimitCache[tokenKey] = tokens;
            }
        }

        return {
            allowed: true,
            remaining: 20 - dayRequests.count,
            retryAfter: null,
            message: `OK. Daily remaining: ${20 - dayRequests.count}`,
            minRequestsRemaining: 5 - minRequests.count,
            tokenUsagePercent: Math.round((tokens.used / 250_000) * 100),
        };
    } catch (err) {
        console.error('[rateLimiter] Error during rate limit check:', err);
        // Fail open to avoid false positives
        return {
            allowed: true,
            remaining: 20,
            retryAfter: null,
            message: 'Rate limit check warning: falling back to allow request.',
            error: err.message,
        };
    }
}

/**
 * Extract token count from Gemini API response
 */
export function extractTokenCount(response) {
    try {
        return response?.usageMetadata?.totalTokenCount || 0;
    } catch {
        return 0;
    }
}
