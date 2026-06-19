import { Router, Request, Response, NextFunction } from "express";
import { body, param } from "express-validator";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import * as reservationService from "../services/reservationService";
import { success } from "../helpers/response";

const router = Router();

// POST /api/reservations — authenticated user
router.post(
  "/",
  auth(),
  [body("event_id").isInt(), body("tier_id").isInt()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await reservationService.create(req.user!, req.body);
      res.status(201).json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reservations/:id — owner or admin
router.get(
  "/:id",
  auth(),
  [param("id").isInt()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await reservationService.getById(req.user!, Number(req.params.id));
      res.json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/reservations/:id/qr — owner or admin
router.get(
  "/:id/qr",
  auth(),
  [param("id").isInt()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await reservationService.getQr(req.user!, Number(req.params.id));
      res.json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

export = router;
