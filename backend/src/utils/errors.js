// Error con código HTTP asociado, para lanzarlo desde controladores/servicios.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = { HttpError };
