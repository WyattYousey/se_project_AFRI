import { checkRateLimit, extractTokenCount } from './rateLimiter.js';

export default async function handler(req, res) {
    console.log(
        '[analyze] handler invoked',
        req.method,
        req.url && req.url.slice ? req.url.slice(0, 200) : req.url
    );

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limit check (Gemini free tier: 20/day, 5/min, 250K tokens/min)
    // Estimate tokens: rough heuristic based on image sizes (~1 token per 100 bytes for images)
    const { baselineImage, newImage } = req.body || {};
    const estimatedTokens = Math.ceil(
        ((baselineImage?.length || 0) + (newImage?.length || 0)) / 100
    );

    const rateLimitResult = await checkRateLimit(req, estimatedTokens);
    if (!rateLimitResult.allowed) {
        res.setHeader('Retry-After', rateLimitResult.retryAfter);
        console.warn(
            `[analyze] Rate limit exceeded for IP: ${rateLimitResult.limitType}`
        );
        return res.status(429).json({
            error: rateLimitResult.message,
            retryAfter: rateLimitResult.retryAfter,
            type: rateLimitResult.limitType,
        });
    }

    console.log(
        `[analyze] Rate limit OK. Remaining daily: ${rateLimitResult.remaining}, Token usage: ${rateLimitResult.tokenUsagePercent}%`
    );

    // Server-side API key ONLY (VITE_* keys are NOT loaded on server)
    // Production: set GENAI_API_KEY via Netlify environment variables
    const apiKey = process.env.GENAI_API_KEY;

    if (!apiKey) {
        console.error(
            '[analyze] CRITICAL: GENAI_API_KEY not set in environment variables'
        );
        return res.status(500).json({
            error: 'Server misconfiguration: missing API key',
            details:
                process.env.NODE_ENV === 'development'
                    ? 'Set GENAI_API_KEY in environment variables'
                    : undefined,
        });
    }

    // Model selection
    const model =
        process.env.VITE_GEMINI_MODEL ||
        process.env.GEMINI_MODEL ||
        'gemini-2.5-flash';

    if (!baselineImage || !newImage) {
        return res.status(400).json({ error: 'Missing images' });
    }

    // Optional guard: avoid enormous payloads
    const MAX_PAYLOAD = 5_000_000; // ~5MB
    if (baselineImage.length > MAX_PAYLOAD || newImage.length > MAX_PAYLOAD) {
        return res
            .status(413)
            .json({ error: 'Payload too large (max 5MB per image)' });
    }

    // Validate image data URLs (basic check)
    const isValidDataUrl = (str) =>
        typeof str === 'string' &&
        (str.startsWith('data:image/') || /^[A-Za-z0-9+/=]+$/.test(str)); // base64 check

    if (!isValidDataUrl(baselineImage) || !isValidDataUrl(newImage)) {
        return res.status(400).json({
            error: 'Invalid image format (expected data URLs or base64)',
        });
    }

    // Expanded JSON Schema that includes accessibility metrics and a summary
    // We require a `summary` object and `changes` array. Each change should include
    // the fields UI depends on plus optional accessibility metrics.
    const responseJsonSchema = {
        type: 'object',
        properties: {
            summary: {
                type: 'object',
                properties: {
                    overallRisk: {
                        type: 'string',
                        enum: ['None', 'Low', 'Medium', 'High'],
                    },
                    topChanges: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                label: { type: 'string' },
                                impact: {
                                    type: 'string',
                                    enum: ['None', 'Low', 'Medium', 'High'],
                                },
                                confidence: { type: 'number' },
                            },
                        },
                        maxItems: 3,
                    },
                    totalChanges: { type: 'number' },
                    summaryText: { type: 'string' },
                },
                required: ['overallRisk', 'totalChanges', 'summaryText'],
            },
            changes: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        bbox: {
                            type: 'object',
                            properties: {
                                x: { type: 'number' },
                                y: { type: 'number' },
                                width: { type: 'number' },
                                height: { type: 'number' },
                            },
                            required: ['x', 'y', 'width', 'height'],
                        },
                        label: { type: 'string' },
                        description: { type: 'string' },
                        uxImpact: {
                            type: 'string',
                            enum: ['None', 'Low', 'Medium', 'High'],
                        },
                        accessibilityImpact: {
                            type: 'string',
                            enum: ['None', 'Low', 'Medium', 'High'],
                        },
                        accessibilityNotes: { type: 'string' },
                        contrastRatio: {
                            oneOf: [
                                { type: 'number' },
                                { type: 'string', enum: ['unknown'] },
                            ],
                        },
                        wcagAA_normal_pass: { type: 'boolean' },
                        wcagAA_large_pass: { type: 'boolean' },
                        violations: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        recommendedFixes: { type: 'string' },
                        mobileImpact: {
                            type: 'string',
                            enum: ['None', 'Low', 'Medium', 'High'],
                        },
                        confidence: { type: 'number', minimum: 0, maximum: 1 },
                    },
                    required: [
                        'id',
                        'bbox',
                        'description',
                        'confidence',
                        'uxImpact',
                        'accessibilityImpact',
                        'mobileImpact',
                    ],
                },
            },
        },
        required: ['summary', 'changes'],
    };

    const generationConfig = {
        responseMimeType: 'application/json',
        responseJsonSchema: responseJsonSchema,
        temperature: 0.1,
    };

    // Helper: normalize and validate the model output so the rest of the app gets a
    // consistent shape. Converts bbox arrays [x1,y1,x2,y2] to objects, clamps values,
    // and provides stable ids when missing.
    function clamp01(v) {
        if (typeof v !== 'number' || Number.isNaN(v)) return 0;
        return Math.min(1, Math.max(0, v));
    }

    function ensureId(change, idx) {
        if (change && change.id) return change.id;
        return `change-${Date.now().toString(36)}-${idx}`;
    }

    function toBBoxObject(bbox) {
        // Accept either an object with x,y,width,height or an array [x1,y1,x2,y2].
        if (!bbox) return null;
        if (Array.isArray(bbox) && bbox.length >= 4) {
            const [x1, y1, x2, y2] = bbox.map(Number);
            const x = clamp01(x1);
            const y = clamp01(y1);
            const width = clamp01(x2 - x1);
            const height = clamp01(y2 - y1);
            return { x, y, width, height };
        }
        if (typeof bbox === 'object') {
            const x = clamp01(Number(bbox.x ?? bbox.left ?? 0));
            const y = clamp01(Number(bbox.y ?? bbox.top ?? 0));
            const width = clamp01(Number(bbox.width ?? bbox.w ?? 0));
            const height = clamp01(Number(bbox.height ?? bbox.h ?? 0));
            if (
                Number.isNaN(x) ||
                Number.isNaN(y) ||
                Number.isNaN(width) ||
                Number.isNaN(height)
            ) {
                return null;
            }
            return { x, y, width, height };
        }
        return null;
    }

    function normalizeAnalysis(parsed) {
        if (!parsed || !Array.isArray(parsed.changes)) {
            console.error(
                '[analyze] normalizeAnalysis called with invalid parsed value:',
                parsed
            );
            throw new Error("Parsed output missing required 'changes' array");
        }
        const changes = parsed.changes
            .map((c, idx) => {
                const bbox = toBBoxObject(c.bbox ?? c.box ?? c.boundingBox);
                if (!bbox) {
                    console.warn(
                        '[analyze] dropping change #' +
                            idx +
                            ' due to invalid bbox',
                        c
                    );
                    return null; // drop items without usable bbox
                }
                const id = ensureId(c, idx);
                const label =
                    c.label || c.changeType || c.description || 'change';
                // Confidence normalization: accept 0..1 or 0..100 percentages
                let rawConf = c.confidence ?? c.conf ?? 1;
                let confidence = Number(rawConf);
                if (Number.isNaN(confidence)) confidence = 1;
                if (confidence > 1)
                    confidence = confidence > 100 ? 1 : confidence / 100;
                confidence = Math.min(1, Math.max(0, confidence));

                const description = String(
                    c.description ?? c.label ?? c.changeType ?? ''
                );
                const uxImpact = c.uxImpact ?? c.ux_impact ?? 'Low';
                const accessibilityImpact =
                    c.accessibilityImpact ?? c.accessibility_impact ?? 'None';
                const accessibilityNotes =
                    c.accessibilityNotes ?? c.accessibility_notes ?? '';
                const mobileImpact =
                    c.mobileImpact ?? c.mobile_impact ?? 'None';

                // Accessibility-specific fields (may be 'unknown' if model cannot compute)
                const contrastRatioRaw =
                    c.contrastRatio ?? c.contrast_ratio ?? undefined;
                const contrastRatio =
                    typeof contrastRatioRaw === 'number'
                        ? Number(contrastRatioRaw)
                        : contrastRatioRaw === 'unknown'
                          ? 'unknown'
                          : 'unknown';
                const wcagAA_normal_pass =
                    c.wcagAA_normal_pass ?? c.wcag_aa_normal_pass ?? false;
                const wcagAA_large_pass =
                    c.wcagAA_large_pass ?? c.wcag_aa_large_pass ?? false;
                const violations = Array.isArray(c.violations)
                    ? c.violations
                    : [];
                const recommendedFixes =
                    c.recommendedFixes ?? c.recommended_fixes ?? '';

                const normalized = {
                    id,
                    bbox,
                    label,
                    confidence,
                    description,
                    uxImpact,
                    accessibilityImpact,
                    accessibilityNotes,
                    contrastRatio,
                    wcagAA_normal_pass,
                    wcagAA_large_pass,
                    violations,
                    recommendedFixes,
                    mobileImpact,
                };

                // Warn if the model omitted fields that the UI depends on
                const missing = [];
                if (c.description == null) missing.push('description');
                if (c.uxImpact == null && c.ux_impact == null)
                    missing.push('uxImpact');
                if (
                    c.accessibilityImpact == null &&
                    c.accessibility_impact == null
                )
                    missing.push('accessibilityImpact');
                if (c.mobileImpact == null && c.mobile_impact == null)
                    missing.push('mobileImpact');
                if (contrastRatioRaw == null) missing.push('contrastRatio');
                if (
                    c.wcagAA_normal_pass == null &&
                    c.wcag_aa_normal_pass == null
                )
                    missing.push('wcagAA_normal_pass');
                if (c.wcagAA_large_pass == null && c.wcag_aa_large_pass == null)
                    missing.push('wcagAA_large_pass');
                if (missing.length) {
                    console.warn(
                        '[analyze] model omitted fields for change',
                        id,
                        missing
                    );
                }
                return normalized;
            })
            .filter(Boolean);

        // Normalize summary into the expected object shape
        let summary = parsed.summary || {};
        if (typeof summary === 'string') {
            summary = {
                overallRisk: 'Low',
                totalChanges: changes.length,
                summaryText: summary,
                topChanges: [],
            };
        } else {
            summary.overallRisk = summary.overallRisk ?? 'Low';
            summary.totalChanges = summary.totalChanges ?? changes.length;
            summary.summaryText = summary.summaryText ?? '';
            summary.topChanges = Array.isArray(summary.topChanges)
                ? summary.topChanges.slice(0, 3)
                : [];
        }

        return {
            summary,
            changes,
        };
    }

    // System instruction
    const systemInstruction = `Analyze two screenshots (baseline, new) and identify factual visual and UX regressions. Be conservative—do NOT invent issues. Output STRICT JSON only that conforms exactly to the provided schema. Use numeric metrics where possible (e.g., color contrast ratio) and follow WCAG 2.1 thresholds to decide accessibility impact. If you cannot confidently compute a numeric metric, set the field to "unknown" and explain your method in accessibilityNotes. Do not include any text outside the required JSON.`;

    // User instruction
    const userInstruction = `Compare the baseline and new screenshots and return STRICT JSON only. For each detected change, include: id (string), bbox (array [x1,y1,x2,y2] normalized 0..1), label (short phrase), description (short sentence), uxImpact (None|Low|Medium|High), accessibilityImpact (None|Low|Medium|High), contrastRatio (number or "unknown"), wcagAA_normal_pass (boolean), wcagAA_large_pass (boolean), accessibilityNotes (string, explain method and recommended fix), mobileImpact (None|Low|Medium|High), and confidence (number 0..1). Also return a summary object with: overallRisk (None|Low|Medium|High),, recommendedFix (string), totalChanges (number), topChanges (array of up to 3 {id,label,impact,confidence}), and summaryText (short string). Be concise and factual. If uncertain about a metric, set it to "unknown". If there are no changes, return {"changes": []}.`;

    // Helpers: parse data URLs (data:<mime>;base64,<data>) or accept raw base64
    function parseDataUri(s) {
        if (!s) return null;
        const m = String(s).match(
            /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/
        );
        if (m) return { mime: m[1], data: m[2] };
        // assume it's already base64
        return { mime: 'image/png', data: s.replace(/^data:.*;base64,/, '') };
    }

    const baseline = parseDataUri(baselineImage);
    const newer = parseDataUri(newImage);

    if (!baseline || !newer || !baseline.data || !newer.data) {
        return res.status(400).json({ error: 'Invalid image data' });
    }

    const contents = [
        { role: 'system', parts: [{ text: systemInstruction }] },
        {
            role: 'user',
            parts: [
                {
                    inline_data: {
                        mime_type: baseline.mime,
                        data: baseline.data,
                    },
                },
                { inline_data: { mime_type: newer.mime, data: newer.data } },
                { text: userInstruction },
            ],
        },
    ];

    // Use the official Google GenAI SDK for Node.js (dynamic import for server environment)
    try {
        const { GoogleGenAI } = await import('@google/genai');

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model,
            contents,
            config: generationConfig,
        });

        const actualTokenCount = extractTokenCount(response);

        const raw =
            response?.text ??
            response?.candidates?.[0]?.content?.parts?.[0]?.text ??
            response?.candidates?.[0]?.content?.parts?.find((p) => p.text)
                ?.text ??
            (response?.candidates?.[0]?.content?.parts
                ? response.candidates[0].content.parts
                      .map((p) => p.text)
                      .join('\n')
                : null) ??
            (typeof response === 'string' ? response : null);

        if (!raw) {
            console.error('[analyze] no usable content in upstream response', {
                response,
            });
            return res
                .status(502)
                .json({ error: 'No usable content in upstream response' });
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            const showRaw = process.env.NODE_ENV !== 'production';
            console.error(
                '[analyze] failed to parse JSON from model:',
                err.message
            );
            return res.status(502).json({
                error: 'AI returned invalid JSON',
                ...(showRaw ? { raw: raw.slice(0, 500) } : {}),
            });
        }

        const normalized = normalizeAnalysis(parsed);

        console.log(
            `[analyze] Request completed. Tokens used: ${actualTokenCount}`
        );

        return res.status(200).json(normalized);
    } catch (err) {
        console.error('[analyze] GenAI SDK error:', err.message, err.status);

        if (err.status === 429) {
            res.setHeader('Retry-After', '60');
            return res.status(429).json({
                error: 'Gemini API rate limit exceeded. Try again in a minute.',
                type: 'api_rate_limit',
            });
        }

        if (err.status === 403 || err.message?.includes('quota')) {
            return res.status(503).json({
                error: 'Daily API quota exceeded. Try again tomorrow.',
                type: 'quota_exceeded',
            });
        }

        if (err.status) {
            const showDetails = process.env.NODE_ENV !== 'production';
            return res.status(502).json({
                error: 'Upstream API error',
                ...(showDetails
                    ? { status: err.status, message: err.message }
                    : {}),
            });
        }

        return res.status(500).json({
            error: 'Internal server error',
            ...(process.env.NODE_ENV !== 'production'
                ? { details: err.message }
                : {}),
        });
    }
}
