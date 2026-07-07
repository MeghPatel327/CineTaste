export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  error_code?: string | null;
}

export function successResponse<T>(data: T, message: string = 'Success'): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    error_code: null,
  };
  return Response.json(response, { status: 200 });
}

export function errorResponse(message: string, status: number = 400, error_code: string | null = null): Response {
  const response: ApiResponse<null> = {
    success: false,
    message,
    data: null,
    error_code,
  };
  return Response.json(response, { status });
}

export function handleApiError(error: any): Response {
  if (error && error.name === "ApiError") {
    return errorResponse(error.message, error.statusCode, error.code);
  }
  console.error("Unhandled API Error:", error);
  return errorResponse("Internal server error", 500, "INTERNAL_ERROR");
}
