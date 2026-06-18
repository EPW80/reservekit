const checkinRepository = require("../repositories/checkinRepository");
const reservationRepository = require("../repositories/reservationRepository");
const db = require("../config/db");

async function checkIn(staffUser, { qr_code }) {
  const reservation = await reservationRepository.findByQrCode(qr_code);
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
      {
        reservation_id: reservation.id,
        staff_id: staffUser.sub,
      },
      client,
    );

    await reservationRepository.updateStatus(reservation.id, "checked_in", client);

    return checkin;
  });
}

async function listByEvent(eventId) {
  return checkinRepository.findByEventId(eventId);
}

module.exports = { checkIn, listByEvent };
