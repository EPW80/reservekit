const { Router } = require("express");
const { param, query } = require("express-validator");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const adminService = require("../services/adminService");
const { success } = require("../helpers/response");

const router = Router();

// GET /api/admin/events/:id/checkins — admin
router.get(
  "/events/:id/checkins",
  auth(["admin"]),
  [param("id").isInt()],
  validate,
  async (req, res, next) => {
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
  async (req, res, next) => {
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

module.exports = router;
