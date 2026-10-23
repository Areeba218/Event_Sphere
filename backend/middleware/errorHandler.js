const multer = require('multer');
const logger = require('../utils/logger');

const notFound = (req, res) => res.status(404).json({ message: 'The requested API endpoint was not found.' });

// eslint-disable-next-line no-unused-vars
function errorHandler(error, req, res, next) {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request body is not valid JSON.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'The request body is too large.' });
  if (error.name === 'CastError') return res.status(400).json({ message: 'One of the identifiers or values in the request is invalid.' });
  if (error.name === 'ValidationError') {
    const first = Object.values(error.errors || {})[0];
    return res.status(400).json({ message: first?.message || 'The submitted data is not valid.' });
  }
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'The file is too large (maximum 5 MB).' : 'The file could not be uploaded.';
    return res.status(400).json({ message });
  }
  if (error.statusCode && error.statusCode < 500) return res.status(error.statusCode).json({ message: error.message });
  logger.error('Unhandled server error', { method: req.method, path: req.originalUrl, error: error.message, stack: error.stack?.split('\n').slice(0, 4) });
  return res.status(500).json({ message: 'An unexpected server error occurred.' });
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = { notFound, errorHandler, HttpError };
