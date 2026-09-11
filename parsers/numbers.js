function parseCount(value) {
  if (value === null || value === undefined || value === '' || value === '-' || value === '--') return null;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new Error('INVALID_NUMBER');
    return Math.round(value);
  }
  const normalized = String(value).replace(/[,+\s]/g, '').replace(/人|次|篇|条|个/g, '');
  const match = normalized.match(/^([0-9]+(?:\.[0-9]+)?)(万|亿|k|K|m|M)?$/);
  if (!match) throw new Error(`INVALID_NUMBER_FORMAT:${value}`);
  const multiplier = { 万: 10000, 亿: 100000000, k: 1000, K: 1000, m: 1000000, M: 1000000 }[match[2]] || 1;
  return Math.round(Number(match[1]) * multiplier);
}

function parseOptionalCount(value, field, errors) {
  try {
    return parseCount(value);
  } catch (error) {
    errors.push({ field, code: 'NUMBER_FORMAT_INVALID', raw: String(value).slice(0, 40) });
    return null;
  }
}

module.exports = { parseCount, parseOptionalCount };
