const jwt = require("jsonwebtoken");

/**
 * Returns middleware that verifies JWT and optionally restricts to given roles.
 * @param {string[]} roles - e.g. ['admin'], ['staff', 'admin'], or [] for any authenticated user
 */
function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers["authorization"];
    if (!header || !header.startsWith("Bearer ")) {
      return next({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Missing or malformed token",
      });
    }

    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (roles.length && !roles.includes(payload.role)) {
        return next({
          status: 403,
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }
      req.user = payload;
      next();
    } catch {
      next({
        status: 401,
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }
  };
}

module.exports = auth;
