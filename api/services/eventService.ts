import * as eventRepository from "../repositories/eventRepository";
import * as tierRepository from "../repositories/tierRepository";
import { uploadImage } from "./uploadService";

export async function listAll() {
  return eventRepository.findAll();
}

export async function getById(id: number) {
  const event = await eventRepository.findById(id);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return event;
}

export async function create(
  fields: { title: string; description?: string | null; date: string; location: string },
  file: Express.Multer.File | undefined,
  userId: number,
) {
  const image_url = file ? await uploadImage(file) : null;
  return eventRepository.create({ ...fields, image_url, created_by: userId });
}

export async function update(
  id: number,
  fields: Record<string, unknown>,
  file?: Express.Multer.File,
) {
  const event = await eventRepository.findById(id);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  if (file) fields.image_url = await uploadImage(file);
  return eventRepository.update(id, fields);
}

export async function softDelete(id: number) {
  const event = await eventRepository.findById(id);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return eventRepository.softDelete(id);
}

export async function listTiers(eventId: number) {
  const event = await eventRepository.findById(eventId);
  if (!event) throw { status: 404, code: "NOT_FOUND", message: "Event not found" };
  return tierRepository.findByEventId(eventId);
}
