import * as tierRepository from "../../repositories/tierRepository";
import * as reservationRepository from "../../repositories/reservationRepository";
import { create, getById, getQr } from "../../services/reservationService";
import type { JwtUser, Tier, Reservation } from "../../types";

jest.mock("../../repositories/tierRepository");
jest.mock("../../repositories/reservationRepository");

const mockedTier = jest.mocked(tierRepository);
const mockedReservation = jest.mocked(reservationRepository);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOCK_USER: JwtUser = { sub: 1, email: "user@example.com", role: "user" };

const MOCK_TIER: Tier = {
  id: 10,
  event_id: 5,
  name: "General",
  price: "20.00",
  capacity: 100,
  sold_count: 0,
};

const MOCK_RESERVATION: Reservation = {
  id: 99,
  user_id: 1,
  event_id: 5,
  tier_id: 10,
  status: "confirmed",
  qr_code: "abc-uuid",
  created_at: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────

describe("reservationService.create", () => {
  it("calls decrementCapacity then creates the reservation", async () => {
    mockedTier.findById.mockResolvedValue(MOCK_TIER);
    mockedTier.decrementCapacity.mockResolvedValue({ ...MOCK_TIER, sold_count: 1 });
    mockedReservation.create.mockResolvedValue(MOCK_RESERVATION);

    await create(MOCK_USER, { event_id: 5, tier_id: 10 });

    expect(mockedTier.decrementCapacity).toHaveBeenCalledWith(10);
    expect(mockedReservation.create).toHaveBeenCalled();
  });

  it("generates a v4 UUID as qr_code", async () => {
    mockedTier.findById.mockResolvedValue(MOCK_TIER);
    mockedTier.decrementCapacity.mockResolvedValue(MOCK_TIER);
    mockedReservation.create.mockResolvedValue(MOCK_RESERVATION);

    await create(MOCK_USER, { event_id: 5, tier_id: 10 });

    const { qr_code } = mockedReservation.create.mock.calls[0][0];
    expect(qr_code).toMatch(UUID_RE);
  });

  it("passes user_id, event_id, and tier_id to repository.create", async () => {
    mockedTier.findById.mockResolvedValue(MOCK_TIER);
    mockedTier.decrementCapacity.mockResolvedValue(MOCK_TIER);
    mockedReservation.create.mockResolvedValue(MOCK_RESERVATION);

    await create(MOCK_USER, { event_id: 5, tier_id: 10 });

    expect(mockedReservation.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 1, event_id: 5, tier_id: 10 }),
    );
  });

  it("throws NOT_FOUND when tier does not exist", async () => {
    mockedTier.findById.mockResolvedValue(null);

    await expect(create(MOCK_USER, { event_id: 5, tier_id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(mockedTier.decrementCapacity).not.toHaveBeenCalled();
    expect(mockedReservation.create).not.toHaveBeenCalled();
  });

  it("throws VALIDATION_ERROR when tier does not belong to the event", async () => {
    mockedTier.findById.mockResolvedValue({ ...MOCK_TIER, event_id: 99 });

    await expect(create(MOCK_USER, { event_id: 5, tier_id: 10 })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    expect(mockedTier.decrementCapacity).not.toHaveBeenCalled();
    expect(mockedReservation.create).not.toHaveBeenCalled();
  });

  it("propagates CONFLICT from decrementCapacity without creating a reservation", async () => {
    mockedTier.findById.mockResolvedValue(MOCK_TIER);
    mockedTier.decrementCapacity.mockRejectedValue({
      status: 409,
      code: "CONFLICT",
      message: "Tier is sold out",
    });

    await expect(create(MOCK_USER, { event_id: 5, tier_id: 10 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    expect(mockedReservation.create).not.toHaveBeenCalled();
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe("reservationService.getById", () => {
  it("returns the reservation for the owner", async () => {
    mockedReservation.findById.mockResolvedValue(MOCK_RESERVATION);

    const result = await getById(MOCK_USER, 99);
    expect(result).toEqual(MOCK_RESERVATION);
  });

  it("allows an admin to access any reservation", async () => {
    mockedReservation.findById.mockResolvedValue(MOCK_RESERVATION);
    const admin: JwtUser = { sub: 999, role: "admin", email: "admin@example.com" };

    await expect(getById(admin, 99)).resolves.toEqual(MOCK_RESERVATION);
  });

  it("throws FORBIDDEN when a non-owner non-admin requests it", async () => {
    mockedReservation.findById.mockResolvedValue(MOCK_RESERVATION); // user_id: 1
    const otherUser: JwtUser = { sub: 2, role: "user", email: "other@example.com" };

    await expect(getById(otherUser, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when the reservation does not exist", async () => {
    mockedReservation.findById.mockResolvedValue(null);

    await expect(getById(MOCK_USER, 999)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── getQr ─────────────────────────────────────────────────────────────────────

describe("reservationService.getQr", () => {
  it("returns qr_code only", async () => {
    mockedReservation.findById.mockResolvedValue(MOCK_RESERVATION);

    const result = await getQr(MOCK_USER, 99);

    expect(result.qr_code).toBe("abc-uuid");
  });

  it("inherits access-control from getById (throws FORBIDDEN for non-owner)", async () => {
    mockedReservation.findById.mockResolvedValue(MOCK_RESERVATION);
    const otherUser: JwtUser = { sub: 2, role: "user", email: "other@example.com" };

    await expect(getQr(otherUser, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
