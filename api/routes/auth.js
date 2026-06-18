const { Router } = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const authService = require("../services/authService");
const { success } = require("../helpers/response");

const router = Router();

router.post(
  "/login",
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
