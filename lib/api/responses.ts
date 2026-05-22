import type { ApiSuccessResponse, ApiErrorResponse } from './types'

export function formatSuccess<T>(data: T): ApiSuccessResponse<T> {
  return {
    status: 'success',
    data,
    timestamp: new Date().toISOString(),
  }
}

export function formatError(
  code: string,
  message: string,
  statusCode: number
): ApiErrorResponse {
  return {
    status: 'error',
    error: message,
    code,
    statusCode,
    timestamp: new Date().toISOString(),
  }
}
