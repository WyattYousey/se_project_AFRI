import { createContext, useContext, useState } from "react";
import { useEffect } from "react";

import mockAnalysis from "../mocks/mockAnalysis";
import test from "node:test";

const USE_MOCK_ANALYSIS = false;

const AppContext = createContext();
export const AppProvider = ({ children }) => {
  const [isDragging, setDragging] = useState(false);
  const [baselineImage, setBaselineImage] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [analysis, setAnalysis] = useState(
    USE_MOCK_ANALYSIS ? mockAnalysis : null
  );
  const [status, setStatus] = useState(USE_MOCK_ANALYSIS ? "complete" : "idle"); // idle | analyzing | complete | error
  const [highlightedChange, setHighlightedChange] = useState(null);
  const [viewer, setViewer] = useState({ zoom: 1, offsetX: 0, offsetY: 0 });

  // Dev-only client-side key (used only for local development prototyping).
  // For production, set `GENAI_API_KEY` on your server and do NOT embed a VITE_* key.
  const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isDev = import.meta.env.DEV === true;
  if (clientApiKey && !isDev) {
    console.warn(
      "VITE_GEMINI_API_KEY is set but the app is not running in development mode. For security, the client-side key will be ignored in production builds. Use a server-side GENAI_API_KEY instead."
    );
  }

  function runInspection() {
    if (!baselineImage || !newImage) return;

    setStatus("analyzing");

    // small UX delay
    new Promise((resolve) => setTimeout(resolve, 800))
      .then(() => {
        if (USE_MOCK_ANALYSIS) {
          setAnalysis(mockAnalysis);
          setStatus("complete");
          return Promise.resolve();
        }

        // Client-side direct Gemini call (works without a backend) if a VITE key is provided.
        // WARNING: Storing API keys in client builds is insecure for production. See docs:
        // https://ai.google.dev/gemini-api/docs/api-key
        const clientApiKey = import.meta.env.VITE_GEMINI_API_KEY;

        function parseDataUrl(dataUrl) {
          const m = dataUrl && dataUrl.match(/^data:(.*?);base64,(.*)$/);
          if (!m) return null;
          return { mime: m[1], base64: m[2] };
        }

        // Client-side helpers to mirror server-side normalization for dev/debugging
        function clamp01(v) {
          if (typeof v !== "number" || Number.isNaN(v)) return 0;
          return Math.min(1, Math.max(0, v));
        }

        function toBBoxObjectClient(bbox) {
          if (!bbox) return null;
          if (Array.isArray(bbox) && bbox.length >= 4) {
            const [x1, y1, x2, y2] = bbox.map(Number);
            const x = clamp01(x1);
            const y = clamp01(y1);
            const width = clamp01(x2 - x1);
            const height = clamp01(y2 - y1);
            return { x, y, width, height };
          }
          if (typeof bbox === "object") {
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

        function normalizeAnalysisClient(parsed) {
          if (!parsed || !Array.isArray(parsed.changes)) {
            console.warn(
              "[client] normalizeAnalysisClient: parsed missing 'changes' array",
              parsed
            );
            return { summary: parsed?.summary || "", changes: [] };
          }
          const changes = parsed.changes
            .map((c, idx) => {
              const bbox = toBBoxObjectClient(c.bbox ?? c.box ?? c.boundingBox);
              if (!bbox) {
                console.warn(
                  "[client] dropping change #" + idx + " due to invalid bbox",
                  c
                );
                return null;
              }

              const id = c.id ?? `change-${Date.now().toString(36)}-${idx}`;
              const label =
                c.label ?? c.changeType ?? c.description ?? "change";

              let rawConf = c.confidence ?? c.conf ?? 1;
              let confidence = Number(rawConf);
              if (Number.isNaN(confidence)) confidence = 1;
              if (confidence > 1)
                confidence = confidence > 100 ? 1 : confidence / 100;
              confidence = Math.min(1, Math.max(0, confidence));

              const description = String(
                c.description ?? c.label ?? c.changeType ?? ""
              );
              const uxImpact = c.uxImpact ?? c.ux_impact ?? "Low";
              const accessibilityImpact =
                c.accessibilityImpact ?? c.accessibility_impact ?? "None";
              const accessibilityNotes =
                c.accessibilityNotes ?? c.accessibility_notes ?? "";
              const mobileImpact = c.mobileImpact ?? c.mobile_impact ?? "None";

              const contrastRatio =
                typeof c.contrastRatio === "number"
                  ? Number(c.contrastRatio)
                  : c.contrast_ratio === "unknown" ||
                    c.contrastRatio === "unknown"
                  ? "unknown"
                  : typeof c.contrast_ratio === "number"
                  ? Number(c.contrast_ratio)
                  : "unknown";
              const wcagAA_normal_pass =
                c.wcagAA_normal_pass ?? c.wcag_aa_normal_pass ?? false;
              const wcagAA_large_pass =
                c.wcagAA_large_pass ?? c.wcag_aa_large_pass ?? false;
              const violations = Array.isArray(c.violations)
                ? c.violations
                : [];
              const recommendedFixes =
                c.recommendedFixes ?? c.recommended_fixes ?? "";

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
              return normalized;
            })
            .filter(Boolean);

          // Normalize summary shape to object
          let summary = parsed.summary || {};
          if (typeof summary === "string") {
            summary = {
              overallRisk: "Low",
              totalChanges: changes.length,
              summaryText: summary,
              topChanges: [],
            };
          } else {
            summary.overallRisk = summary.overallRisk ?? "Low";
            summary.totalChanges = summary.totalChanges ?? changes.length;
            summary.summaryText = summary.summaryText ?? "";
            summary.topChanges = Array.isArray(summary.topChanges)
              ? summary.topChanges.slice(0, 3)
              : [];
          }

          return { summary, changes };
        }

        if (clientApiKey && isDev) {
          // Only allow direct client key usage in development mode for quick prototyping.
          const base = parseDataUrl(baselineImage);
          const newer = parseDataUrl(newImage);
          if (!base || !newer) {
            return Promise.reject(new Error("Invalid data URLs for images"));
          }

          const endpoint =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

          const payload = {
            contents: [
              {
                role: "user",
                parts: [
                  { inline_data: { mime_type: base.mime, data: base.base64 } },
                  {
                    inline_data: { mime_type: newer.mime, data: newer.base64 },
                  },
                  {
                    text: 'Compare the two images and return STRICT JSON only. For each detected change include: bbox (array [x1,y1,x2,y2] normalized 0..1), id (string), description (short sentence), label (short phrase), uxImpact (None|Low|Medium|High), accessibilityImpact (None|Low|Medium|High), contrastRatio (number or "unknown"), wcagAA_normal_pass (boolean), wcagAA_large_pass (boolean), accessibilityNotes (string, explain method and recommended fix), recommendedFixes (string), mobileImpact (None|Low|Medium|High), and confidence (number 0..1). Also include a summary object: overallRisk (None|Low|Medium|High), totalChanges (number), topChanges (array of up to 3 {id,label,impact,confidence}), and summaryText (short string). If unsure about metrics, set them to "unknown". Only return valid JSON matching the schema.',
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: {
                type: "object",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      overallRisk: {
                        type: "string",
                        enum: ["None", "Low", "Medium", "High"],
                      },
                      topChanges: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            label: { type: "string" },
                            impact: {
                              type: "string",
                              enum: ["None", "Low", "Medium", "High"],
                            },
                            confidence: { type: "number" },
                          },
                        },
                        maxItems: 3,
                      },
                      totalChanges: { type: "number" },
                      summaryText: { type: "string" },
                    },
                    required: ["overallRisk", "totalChanges", "summaryText"],
                  },
                  changes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        bbox: { type: "array", items: { type: "number" } },
                        label: { type: "string" },
                        description: { type: "string" },
                        uxImpact: {
                          type: "string",
                          enum: ["None", "Low", "Medium", "High"],
                        },
                        accessibilityImpact: {
                          type: "string",
                          enum: ["None", "Low", "Medium", "High"],
                        },
                        contrastRatio: {
                          oneOf: [
                            { type: "number" },
                            { type: "string", enum: ["unknown"] },
                          ],
                        },
                        wcagAA_normal_pass: { type: "boolean" },
                        wcagAA_large_pass: { type: "boolean" },
                        accessibilityNotes: { type: "string" },
                        recommendedFixes: { type: "string" },
                        mobileImpact: {
                          type: "string",
                          enum: ["None", "Low", "Medium", "High"],
                        },
                        confidence: { type: "number" },
                      },
                      required: [
                        "id",
                        "bbox",
                        "description",
                        "confidence",
                        "uxImpact",
                        "accessibilityImpact",
                        "mobileImpact",
                      ],
                    },
                  },
                },
                required: ["summary", "changes"],
              },
            },
          };

          console.warn("Using client-side Gemini key — development only");

          return fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": clientApiKey,
            },
            body: JSON.stringify(payload),
          })
            .then((resp) => {
              if (!resp.ok) {
                return resp.text().then((t) => {
                  throw new Error("Gemini API error: " + (t || resp.status));
                });
              }
              return resp.json();
            })
            .then((respJson) => {
              const text = respJson?.candidates?.[0]?.content?.parts?.[0]?.text;
              console.log(text);
              if (!text) throw new Error("No model text candidate in response");
              let parsed;
              try {
                parsed = JSON.parse(text);
              } catch (e) {
                console.error(
                  "[client] failed to parse JSON from model:",
                  e.message
                );
                throw new Error(
                  "Failed to parse JSON from model: " + e.message
                );
              }
              setAnalysis(parsed);
              setStatus("complete");
            });
        }

        // Fallback: call your server-side analyze endpoint
        return fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },

          body: JSON.stringify({ baselineImage, newImage }),
        })
          .then((response) => {
            if (!response.ok) {
              return response.text().then((text) => {
                throw new Error(
                  "API request failed: " + (text || response.status)
                );
              });
            }
            return response.json();
          })
          .then((data) => {
            let final = data;
            // If server returned non-normalized bbox arrays or missing description fields, normalize here as a fallback
            const serverLooksUnnormalized =
              !Array.isArray(data?.changes) ||
              (data?.changes?.[0] && Array.isArray(data.changes[0].bbox));
            if (serverLooksUnnormalized) {
              console.warn(
                "[client] server response appears unnormalized; applying client-side normalization"
              );
              final = normalizeAnalysisClient(data);
            }
            setAnalysis(final);
            setStatus("complete");
          });
      })
      .catch((error) => {
        console.error(error);
        setStatus("error");
      });
  }

  const value = {
    baselineImage,
    setBaselineImage,
    newImage,
    setNewImage,
    analysis,
    setAnalysis,
    status,
    setStatus,
    highlightedChange,
    setHighlightedChange,
    viewer,
    setViewer,
    runInspection,
    isDragging,
    setDragging,
    isClientKeyPresent: Boolean(clientApiKey),
    isDev,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
