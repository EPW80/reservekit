import { Router, Request, Response, NextFunction } from "express";
import { body } from "express-validator";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import * as checkinService from "../services/checkinService";
import { success } from "../helpers/response";

const router = Router();

// POST /api/checkins — staff or admin; body: { qr_code }
router.post(
  "/",
  auth(["staff", "admin"]),
  [body("qr_code").isUUID().withMessage("qr_code must be a valid UUID")],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await checkinService.checkIn(req.user!, req.body);
      res.status(201).json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

export = router;
