const { Router } = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const validate = require("../middleware/validate");
const authService = require("../services/authService");
const { success } = require("../helpers/response");
const { AUTH_RATE_LIMIT_WINDOW_MS, AUTH_RATE_LIMIT_MAX } = require("../config/constants");

const router = Router();

// Stricter limiter to blunt credential stuffing / brute force on login.
// Disabled under test (see app.js) so repeated login calls stay deterministic.
const loginLimiter =
  process.env.NODE_ENV === "test"
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
        max: AUTH_RATE_LIMIT_MAX,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) =>
          res.status(429).json({
            data: null,
            error: {
              code: "RATE_LIMITED",
              message: "Too many login attempts, please try again later",
            },
          }),
      });

router.post(
  "/login",
  loginLimiter,
  [body("email").isEmail(), body("password").notEmpty()],
  validate,
  async (req, res, next) => {
    try {
      const data = await authService.login(req.body.email, req.body.password);
      res.json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
