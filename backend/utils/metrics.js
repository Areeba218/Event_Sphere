// Lightweight in-process monitoring: request counts, errors and latency.
const started = Date.now();
const stats = { requests: 0, errors4xx: 0, errors5xx: 0, totalMs: 0, slow: 0 };

function middleware(req, res, next) {
  const t0 = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    stats.requests += 1;
    stats.totalMs += ms;
    if (ms > 2000) stats.slow += 1;
    if (res.statusCode >= 500) stats.errors5xx += 1;
    else if (res.statusCode >= 400) stats.errors4xx += 1;
  });
  next();
}

function snapshot() {
  const mem = process.memoryUsage();
  return {
    uptimeSeconds: Math.round((Date.now() - started) / 1000),
    requests: stats.requests,
    clientErrors: stats.errors4xx,
    serverErrors: stats.errors5xx,
    slowRequests: stats.slow,
    averageResponseMs: stats.requests ? Math.round(stats.totalMs / stats.requests) : 0,
    memoryMb: Math.round(mem.rss / 1024 / 1024),
  };
}

module.exports = { middleware, snapshot };
