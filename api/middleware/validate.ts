import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({
      status: 400,
      code: "VALIDATION_ERROR",
      message: errors
        .array()
        .map((e) => e.msg)
        .join("; "),
    });
  }
  next();
}

export = validate;
