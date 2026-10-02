// Thrown by services for problems the user can fix or should see.
// application.js turns it into a JSON response with the given status.
// extraResponseFields adds e.g. { fieldErrors } or { problems } to the response.
export class ServiceError extends Error {
  constructor(status, message, extraResponseFields = {}) {
    super(message);
    this.status = status;
    this.extraResponseFields = extraResponseFields;
  }

  static badRequest(message, extraResponseFields) {
    return new ServiceError(400, message, extraResponseFields);
  }

  static invalidFields(fieldErrors) {
    return new ServiceError(400, 'Please check the highlighted fields.', { fieldErrors });
  }

  static forbidden(message) {
    return new ServiceError(403, message);
  }

  static notFound(message) {
    return new ServiceError(404, message);
  }

  // The request was fine but the shop has changed, e.g. a slot just filled up.
  static conflict(message, extraResponseFields) {
    return new ServiceError(409, message, extraResponseFields);
  }

  static unavailable(message) {
    return new ServiceError(503, message);
  }
}

export function throwIfFieldErrors(fieldErrors) {
  if (Object.keys(fieldErrors).length > 0) throw ServiceError.invalidFields(fieldErrors);
}
