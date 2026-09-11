function extractionPrelude(selectors) {
  return `
    const SELECTORS = ${JSON.stringify(selectors)};
    const firstText = (items) => {
      for (const selector of items) {
        const node = document.querySelector(selector);
        const value = node?.textContent?.trim();
        if (value) return value;
      }
      return null;
    };
    const firstAttr = (items, attrs) => {
      for (const selector of items) {
        const node = document.querySelector(selector);
        for (const attr of attrs) {
          const value = node?.getAttribute?.(attr);
          if (value) return value;
        }
      }
      return null;
    };
    const safeUrl = (value) => {
      if (!value) return null;
      try { const u = new URL(value, location.href); return u.origin + u.pathname; } catch { return null; }
    };
  `;
}

function cleanText(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function sanitizePageUrl(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return null;
  }
}

module.exports = { cleanText, extractionPrelude, sanitizePageUrl };
