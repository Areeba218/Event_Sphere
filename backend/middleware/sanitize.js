// Strips MongoDB operator injection ("$gt", "a.b") from request bodies.
function clean(value, depth = 0) {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => clean(item, depth + 1));
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (key.startsWith('$') || key.includes('.')) continue;
    out[key] = clean(val, depth + 1);
  }
  return out;
}

module.exports = (req, res, next) => {
  if (req.body && typeof req.body === 'object') req.body = clean(req.body);
  next();
};
