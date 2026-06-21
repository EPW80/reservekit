import { randomUUID } from "node:crypto";
import * as reservationRepository from "../repositories/reservationRepository";
import * as tierRepository from "../repositories/tierRepository";
import type { JwtUser } from "../types";

export async function create(user: JwtUser, body: { event_id: number; tier_id: number }) {
  const { event_id, tier_id } = body;
  const tier = await tierRepository.findById(tier_id);
  if (!tier) throw { status: 404, code: "NOT_FOUND", message: "Tier not found" };
  if (tier.event_id !== event_id) {
    throw { status: 400, code: "VALIDATION_ERROR", message: "Tier does not belong to this event" };
  }

  // Atomic: increments sold_count only if sold_count < capacity; throws CONFLICT if sold out
  await tierRepository.decrementCapacity(tier_id);

  const qr_code = randomUUID();
  return reservationRepository.create({ user_id: user.sub, event_id, tier_id, qr_code });
}

export async function getById(user: JwtUser, id: number) {
  const reservation = await reservationRepository.findById(id);
  if (!reservation) throw { status: 404, code: "NOT_FOUND", message: "Reservation not found" };
  if (reservation.user_id !== user.sub && user.role !== "admin") {
    throw { status: 403, code: "FORBIDDEN", message: "Access denied" };
  }
  return reservation;
}

export async function getQr(user: JwtUser, id: number) {
  const reservation = await getById(user, id);
  return { qr_code: reservation.qr_code };
}
