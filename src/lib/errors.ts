export type ApiErrorCode =
  | 'NETWORK'
  | 'SERVER'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'BANNED'
  | 'SLOT_TAKEN'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_TAKEN'
  | 'PHONE_TAKEN';

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Ключи i18n для человекочитаемых сообщений об ошибках. */
export type ErrorMessageKey =
  | 'errors.generic'
  | 'errors.network'
  | 'errors.server'
  | 'errors.unauthorized'
  | 'errors.notFound'
  | 'auth.errors.invalidCredentials'
  | 'auth.errors.emailTaken'
  | 'auth.errors.phoneTaken'
  | 'auth.errors.banned'
  | 'booking.slotTaken';

export function errorMessageKey(error: unknown): ErrorMessageKey {
  if (!isApiError(error)) return 'errors.generic';
  switch (error.code) {
    case 'NETWORK':
      return 'errors.network';
    case 'SERVER':
      return 'errors.server';
    case 'UNAUTHORIZED':
      return 'errors.unauthorized';
    case 'NOT_FOUND':
      return 'errors.notFound';
    case 'INVALID_CREDENTIALS':
      return 'auth.errors.invalidCredentials';
    case 'EMAIL_TAKEN':
      return 'auth.errors.emailTaken';
    case 'PHONE_TAKEN':
      return 'auth.errors.phoneTaken';
    case 'BANNED':
      return 'auth.errors.banned';
    case 'SLOT_TAKEN':
      return 'booking.slotTaken';
    case 'FORBIDDEN':
    case 'VALIDATION':
      return 'errors.generic';
  }
}

/** Ошибки, которые нет смысла повторять автоматически. */
export function isRetryable(error: unknown): boolean {
  if (!isApiError(error)) return true;
  return error.code === 'NETWORK' || error.code === 'SERVER';
}
