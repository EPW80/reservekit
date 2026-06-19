import { Request, Response, NextFunction, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import logger from "../config/logger";
import type { JwtUser, Role } from "../types";

/**
 * Returns middleware that verifies the JWT and optionally restricts to roles.
 * @param roles e.g. ['admin'], ['staff', 'admin'], or [] for any authenticated user
 */
function auth(roles: Role[] = []): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) {
      return next({ status: 401, code: "UNAUTHORIZED", message: "Missing or malformed token" });
    }

    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as JwtUser;
      if (roles.length && !roles.includes(payload.role)) {
        return next({ status: 403, code: "FORBIDDEN", message: "Insufficient permissions" });
      }
      req.user = payload;
      next();
    } catch (err) {
      // Surface why verification failed for debugging, without leaking to clients.
      logger.debug({ err: (err as Error).message }, "token verification failed");
      next({ status: 401, code: "UNAUTHORIZED", message: "Invalid or expired token" });
    }
  };
}

export = auth;
