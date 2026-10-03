class AppError extends Error { constructor(message, code='APP_ERROR', details={}) { super(message); this.name='AppError'; this.code=code; this.details=details; } }
class ConflictError extends AppError { constructor(message, details={}) { super(message,'CONFLICT',details); } }
class ValidationError extends AppError { constructor(message, details={}) { super(message,'VALIDATION_ERROR',details); } }
module.exports = { AppError, ConflictError, ValidationError };
