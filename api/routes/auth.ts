import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";
import validate from "../middleware/validate";
import * as authService from "../services/authService";
import { success } from "../helpers/response";
import { AUTH_RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_MAX } from "../config/constants";

const router = Router();

// Stricter limiter to blunt credential stuffing / brute force on login.
// Disabled under test (see app.ts) so repeated login calls stay deterministic.
const loginLimiter: RequestHandler =
  process.env.NODE_ENV === "test"
    ? (_req, _res, next) => next()
    : rateLimit({
        windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
        max: AUTH_RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (_req, res) => {
          res.status(429).json({
            data: null,
            error: {
              code: "RATE_LIMITED",
              message: "Too many login attempts, please try again later",
            },
          });
        },
      });

router.post(
  "/login",
  loginLimiter,
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.login(req.body.email, req.body.password);
      res.json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

export = router;
