const checkinRepository = require("../repositories/checkinRepository");
const reservationRepository = require("../repositories/reservationRepository");
const eventRepository = require("../repositories/eventRepository");

async function listCheckins(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return checkinRepository.findByEventId(eventId);
}

// Characters that spreadsheet apps treat as the start of a formula. A leading
// one must be neutralized or a malicious name/email becomes an executable cell.
const CSV_FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

function sanitizeCsvField(value) {
  if (value == null) return '""';
  let str = String(value);
  if (CSV_FORMULA_PREFIXES.includes(str[0])) {
    str = `'${str}`; // prefix with apostrophe so it's treated as text
  }
  return `"${str.replace(/"/g, '""')}"`;
}

async function exportCsv(eventId) {
  const header = "name,email,event,tier,status,checked_in\n";
  const rows = await reservationRepository.findForExport(eventId);
  if (!rows.length) return header;

  const body = rows
    .map((r) =>
      [r.name, r.email, r.event_name, r.tier_name, r.status, r.checked_in ? "yes" : "no"]
        .map(sanitizeCsvField)
        .join(","),
    )
    .join("\n");

  return header + body;
}

module.exports = { listCheckins, exportCsv, sanitizeCsvField };
