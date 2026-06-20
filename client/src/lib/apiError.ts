// Narrow an unknown caught value (typically an Axios error) to the API's
// error envelope, without pulling axios types into every call site.
interface ApiErrorShape {
  response?: { data?: { error?: { code?: string; message?: string } } };
}

export function apiErrorCode(err: unknown): string | undefined {
  return (err as ApiErrorShape)?.response?.data?.error?.code;
}

export function apiErrorMessage(err: unknown, fallback: string): string {
  return (err as ApiErrorShape)?.response?.data?.error?.message ?? fallback;
}
