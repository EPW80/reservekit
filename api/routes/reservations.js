const { Router } = require("express");
const { body, param } = require("express-validator");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const reservationService = require("../services/reservationService");
const { success } = require("../helpers/response");

const router = Router();

// POST /api/reservations — authenticated user
router.post(
  "/",
  auth(),
  [body("event_id").isInt(), body("tier_id").isInt()],
  validate,
  async (req, res, next) => {
    try {
      const data = await reservationService.create(req.user, req.body);
      res.status(201).json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reservations/:id — owner or admin
router.get("/:id", auth(), [param("id").isInt()], validate, async (req, res, next) => {
  try {
    const data = await reservationService.getById(req.user, Number(req.params.id));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

// GET /api/reservations/:id/qr — owner or admin
router.get("/:id/qr", auth(), [param("id").isInt()], validate, async (req, res, next) => {
  try {
    const data = await reservationService.getQr(req.user, Number(req.params.id));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
