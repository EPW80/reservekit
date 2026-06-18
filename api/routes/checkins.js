const { Router } = require("express");
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const checkinService = require("../services/checkinService");
const { success } = require("../helpers/response");

const router = Router();

// POST /api/checkins — staff or admin; body: { qr_code }
router.post(
  "/",
  auth(["staff", "admin"]),
  [body("qr_code").isUUID().withMessage("qr_code must be a valid UUID")],
  validate,
  async (req, res, next) => {
    try {
      const data = await checkinService.checkIn(req.user, req.body);
      res.status(201).json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

module.exports = router;
