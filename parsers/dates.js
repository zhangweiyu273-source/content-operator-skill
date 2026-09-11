function normalizeDate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const text = String(value).trim().replace(/年|\//g, '-').replace(/月/g, '-').replace(/日/g, '');
  const match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) throw new Error(`DATE_FORMAT_INVALID:${value}`);
  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute}:${second}+08:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.valueOf()) || parsed.getUTCMonth() + 1 !== Number(month) || parsed.getUTCDate() !== Number(day)) {
    throw new Error(`DATE_VALUE_INVALID:${value}`);
  }
  return parsed.toISOString();
}

module.exports = { normalizeDate };
