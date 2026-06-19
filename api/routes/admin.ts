import { Router, Request, Response, NextFunction } from "express";
import { param, query } from "express-validator";
import validate from "../middleware/validate";
import auth from "../middleware/auth";
import * as adminService from "../services/adminService";
import { success } from "../helpers/response";

const router = Router();

// GET /api/admin/events/:id/checkins — admin
router.get(
  "/events/:id/checkins",
  auth(["admin"]),
  [param("id").isInt()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await adminService.listCheckins(Number(req.params.id));
      res.json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/admin/export — admin; ?event_id= optional filter
router.get(
  "/export",
  auth(["admin"]),
  [query("event_id").optional().isInt()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csv = await adminService.exportCsv(
        req.query.event_id ? Number(req.query.event_id) : undefined,
      );
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", 'attachment; filename="attendees.csv"');
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
);

export = router;
