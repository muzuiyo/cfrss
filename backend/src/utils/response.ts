import { Context } from "hono";

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

// Success response helper
export const successResponse = <T>(
  c: Context,
  data: T,
  meta?: { page?: number; per_page?: number; total?: number }
) => {
  const response: SuccessResponse<T> = { success: true, data };
  if (meta) {
    response.meta = meta;
  }
  return c.json(response);
};

// Error response helper
export const errorResponse = (
  c: Context,
  code: string,
  message: string,
  status: number = 400
) => {
  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };
  return c.json(response, status as any);
};

// Common error codes
export const ErrorCodes = {
  INVALID_REQUEST: "INVALID_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  FEED_FETCH_ERROR: "FEED_FETCH_ERROR",
  FEED_PARSE_ERROR: "FEED_PARSE_ERROR",
  DUPLICATE_FEED: "DUPLICATE_FEED",
  OPML_PARSE_ERROR: "OPML_PARSE_ERROR",
} as const;
