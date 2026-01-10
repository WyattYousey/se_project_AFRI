const mockAnalysis = {
  changes: [
    {
      id: "change-1",
      bbox: {
        x: 0.1,
        y: 0.25,
        width: 0.35,
        height: 0.08,
      },
      changeType: "accessibility",
      description:
        "Primary CTA text size was reduced, making it harder to read.",
      uxImpact: "Medium",
      accessibilityImpact: "High",
      accessibilityNotes:
        "Text size may fall below WCAG minimums on small mobile screens.",
      mobileImpact: "High",
      confidence: 0.88,
    },
    {
      id: "change-2",
      bbox: {
        x: 0.55,
        y: 0.6,
        width: 0.3,
        height: 0.12,
      },
      changeType: "color",
      description:
        "Secondary button contrast was reduced against the background.",
      uxImpact: "Low",
      accessibilityImpact: "Medium",
      accessibilityNotes: "Contrast ratio may not meet WCAG AA requirements.",
      mobileImpact: "Medium",
      confidence: 0.74,
    },
  ],
  summary: {
    overallRisk: "Medium",
    accessibilityRisk: "High",
    notes:
      "Most regressions affect readability and contrast, especially on mobile devices.",
  },
};

export default mockAnalysis;
