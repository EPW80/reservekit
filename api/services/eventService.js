const eventRepository = require("../repositories/eventRepository");
const tierRepository = require("../repositories/tierRepository");
const { uploadImage } = require("./uploadService");

async function listAll() {
  return eventRepository.findAll();
}

async function getById(id) {
  const event = await eventRepository.findById(id);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return event;
}

async function create(fields, file, userId) {
  const image_url = file ? await uploadImage(file) : null;
  return eventRepository.create({ ...fields, image_url, created_by: userId });
}

async function update(id, fields, file) {
  const event = await eventRepository.findById(id);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  if (file) fields.image_url = await uploadImage(file);
  return eventRepository.update(id, fields);
}

async function softDelete(id) {
  const event = await eventRepository.findById(id);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return eventRepository.softDelete(id);
}

async function listTiers(eventId) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return tierRepository.findByEventId(eventId);
}

module.exports = { listAll, getById, create, update, softDelete, listTiers };
