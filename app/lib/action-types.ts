/**
 * Standard result type for server actions that need to surface errors
 * across the Next.js server/client boundary.
 *
 * Custom error classes lose their prototype chain during serialization, and in
 * production Next.js strips error messages entirely. Returning a plain object
 * with `success`, `error`, and `code` fields ensures the message always
 * arrives at the client intact.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code: 'VALIDATION' | 'CONFLICT' | 'NOT_FOUND' | 'BUSINESS_RULE' | 'UNKNOWN' };
