function normalizeAccountId(value) {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const labeled = text.match(/(?:小红书号|账号(?:ID)?|帐号(?:ID)?)[：:\s]+([A-Za-z0-9_-]{3,100})/i);
  if (labeled) return labeled[1];
  return /^[A-Za-z0-9_-]{3,100}$/.test(text) ? text : null;
}

module.exports = { normalizeAccountId };
