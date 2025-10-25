export class ContractError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ContractError";
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "NetworkError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

export function isKnownError(error: unknown): error is
  | ContractError
  | NetworkError
  | ValidationError
  | ApiError {
  return (
    error instanceof ContractError ||
    error instanceof NetworkError ||
    error instanceof ValidationError ||
    error instanceof ApiError
  );
}
