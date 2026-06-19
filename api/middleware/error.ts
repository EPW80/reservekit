import { Request, Response, NextFunction } from "express";
import multer from "multer";
import logger from "../config/logger";
import type { AppError } from "../types";

const CODE_STATUS: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void {
  if (err instanceof multer.MulterError) {
    res.status(400).json({ data: null, error: { code: "VALIDATION_ERROR", message: err.message } });
    return;
  }

  const e = err as AppError;
  const isDev = process.env.NODE_ENV === "development";
  const code = e.code || "INTERNAL";
  const status = e.status || CODE_STATUS[code] || 500;

  // For unexpected (500) errors, log the full error but never leak internals
  // (e.g. Postgres constraint messages) to the client outside development.
  let message: string;
  if (status === 500) {
    logger.error({ err }, "Unhandled error");
    message = isDev
      ? (e.message ?? "An unexpected error occurred")
      : "An unexpected error occurred";
  } else {
    message = e.message || "An unexpected error occurred";
  }

  const error: { code: string; message: string; stack?: string } = { code, message };
  if (isDev && (err as Error).stack) error.stack = (err as Error).stack;

  res.status(status).json({ data: null, error });
}

export = errorHandler;
