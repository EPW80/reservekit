import * as checkinRepository from "../repositories/checkinRepository";
import * as reservationRepository from "../repositories/reservationRepository";
import db from "../config/db";
import type { JwtUser } from "../types";

export async function checkIn(staffUser: JwtUser, body: { qr_code: string }) {
  const reservation = await reservationRepository.findByQrCode(body.qr_code);
  if (!reservation) {
    throw { status: 404, code: "NOT_FOUND", message: "Reservation not found" };
  }
  if (reservation.status === "cancelled") {
    throw { status: 409, code: "CONFLICT", message: "Reservation is cancelled" };
  }
  if (reservation.status === "checked_in") {
    throw { status: 409, code: "CONFLICT", message: "Already checked in" };
  }

  return db.withTransaction(async (client) => {
    const checkin = await checkinRepository.create(
      { reservation_id: reservation.id, staff_id: staffUser.sub },
      client,
    );

    await reservationRepository.updateStatus(reservation.id, "checked_in", client);

    return checkin;
  });
}

export async function listByEvent(eventId: number) {
  return checkinRepository.findByEventId(eventId);
}
