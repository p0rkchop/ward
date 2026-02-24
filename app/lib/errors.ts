// Custom error classes for structured error handling
export class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
  details?: Record<string, string>;

  constructor(message: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class NotFoundError extends Error {
  code = 'NOT_FOUND';

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  code = 'CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends Error {
  code = 'BUSINESS_RULE_VIOLATION';

  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}