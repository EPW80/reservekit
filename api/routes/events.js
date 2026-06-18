const { Router } = require("express");
const { body, param } = require("express-validator");
const multer = require("multer");
const validate = require("../middleware/validate");
const auth = require("../middleware/auth");
const eventService = require("../services/eventService");
const { success } = require("../helpers/response");

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname));
  },
});

// GET /api/events — public
router.get("/", async (req, res, next) => {
  try {
    res.json(success(await eventService.listAll()));
  } catch (err) {
    next(err);
  }
});

// POST /api/events — admin
router.post(
  "/",
  auth(["admin"]),
  upload.single("image"),
  [
    body("title").notEmpty().withMessage("title is required"),
    body("date").isISO8601().withMessage("date must be ISO 8601"),
    body("location").notEmpty().withMessage("location is required"),
  ],
  validate,
  async (req, res, next) => {
    try {
      const data = await eventService.create(req.body, req.file, req.user.sub);
      res.status(201).json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/events/:id — public
router.get("/:id", [param("id").isInt()], validate, async (req, res, next) => {
  try {
    const data = await eventService.getById(Number(req.params.id));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/events/:id — admin
router.patch(
  "/:id",
  auth(["admin"]),
  upload.single("image"),
  [param("id").isInt()],
  validate,
  async (req, res, next) => {
    try {
      const data = await eventService.update(Number(req.params.id), req.body, req.file);
      res.json(success(data));
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /api/events/:id — admin (soft-delete)
router.delete("/:id", auth(["admin"]), [param("id").isInt()], validate, async (req, res, next) => {
  try {
    const data = await eventService.softDelete(Number(req.params.id));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

// GET /api/events/:id/tiers — public
router.get("/:id/tiers", [param("id").isInt()], validate, async (req, res, next) => {
  try {
    const data = await eventService.listTiers(Number(req.params.id));
    res.json(success(data));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
