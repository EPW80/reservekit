export interface ApiError {
  code: string;
  message: string;
}

export interface Envelope<T> {
  data: T | null;
  error: ApiError | null;
}

export const success = <T>(data: T): Envelope<T> => ({ data, error: null });

export const error = (code: string, message: string): Envelope<never> => ({
  data: null,
  error: { code, message },
});
