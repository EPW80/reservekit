const checkinRepository = require("../repositories/checkinRepository");
const reservationRepository = require("../repositories/reservationRepository");
const eventRepository = require("../repositories/eventRepository");

async function listCheckins(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return checkinRepository.findByEventId(eventId);
}

async function exportCsv(eventId) {
  const rows = await reservationRepository.findForExport(eventId);
  if (!rows.length) return "name,email,event,tier,status,checked_in\n";

  const header = "name,email,event,tier,status,checked_in\n";
  const body = rows
    .map((r) =>
      [r.name, r.email, r.event_name, r.tier_name, r.status, r.checked_in ? "yes" : "no"]
        .map((v) => (v == null ? '""' : `"${String(v).replace(/"/g, '""')}"`))
        .join(","),
    )
    .join("\n");

  return header + body;
}

module.exports = { listCheckins, exportCsv };
