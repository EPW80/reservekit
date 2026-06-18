const { v4: uuidv4 } = require("uuid");
const reservationRepository = require("../repositories/reservationRepository");
const tierRepository = require("../repositories/tierRepository");

async function create(user, { event_id, tier_id }) {
  const tier = await tierRepository.findById(tier_id);
  if (!tier) throw { status: 404, code: "NOT_FOUND", message: "Tier not found" };
  if (tier.event_id !== event_id) {
    throw { status: 400, code: "VALIDATION_ERROR", message: "Tier does not belong to this event" };
  }

  // Atomic: increments sold_count only if sold_count < capacity; throws CONFLICT if sold out
  await tierRepository.decrementCapacity(tier_id);

  const qr_code = uuidv4();
  return reservationRepository.create({ user_id: user.sub, event_id, tier_id, qr_code });
}

async function getById(user, id) {
  const reservation = await reservationRepository.findById(id);
  if (!reservation) throw { status: 404, code: "NOT_FOUND", message: "Reservation not found" };
  if (reservation.user_id !== user.sub && user.role !== "admin") {
    throw { status: 403, code: "FORBIDDEN", message: "Access denied" };
  }
  return reservation;
}

async function getQr(user, id) {
  const reservation = await getById(user, id);
  return { qr_code: reservation.qr_code };
}

module.exports = { create, getById, getQr };
