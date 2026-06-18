jest.mock("../../repositories/tierRepository");
jest.mock("../../repositories/reservationRepository");
jest.mock("qrcode");

const tierRepository = require("../../repositories/tierRepository");
const reservationRepository = require("../../repositories/reservationRepository");
const qrcode = require("qrcode");
const { create, getById, getQr } = require("../../services/reservationService");

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MOCK_USER = { sub: 1, email: "user@example.com", role: "user" };

const MOCK_TIER = {
  id: 10,
  event_id: 5,
  name: "General",
  price: "20.00",
  capacity: 100,
  sold_count: 0,
};

const MOCK_RESERVATION = {
  id: 99,
  user_id: 1,
  event_id: 5,
  tier_id: 10,
  status: "confirmed",
  qr_code: "abc-uuid",
  created_at: new Date(),
};

beforeEach(() => jest.clearAllMocks());

// ── create ────────────────────────────────────────────────────────────────────

describe("reservationService.create", () => {
  it("calls decrementCapacity then creates the reservation", async () => {
    tierRepository.findById.mockResolvedValue(MOCK_TIER);
    tierRepository.decrementCapacity.mockResolvedValue({ ...MOCK_TIER, sold_count: 1 });
    reservationRepository.create.mockResolvedValue(MOCK_RESERVATION);

    await create(MOCK_USER, { event_id: 5, tier_id: 10 });

    expect(tierRepository.decrementCapacity).toHaveBeenCalledWith(10);
    expect(reservationRepository.create).toHaveBeenCalled();
  });

  it("generates a v4 UUID as qr_code", async () => {
    tierRepository.findById.mockResolvedValue(MOCK_TIER);
    tierRepository.decrementCapacity.mockResolvedValue(MOCK_TIER);
    reservationRepository.create.mockResolvedValue(MOCK_RESERVATION);

    await create(MOCK_USER, { event_id: 5, tier_id: 10 });

    const { qr_code } = reservationRepository.create.mock.calls[0][0];
    expect(qr_code).toMatch(UUID_RE);
  });

  it("passes user_id, event_id, and tier_id to repository.create", async () => {
    tierRepository.findById.mockResolvedValue(MOCK_TIER);
    tierRepository.decrementCapacity.mockResolvedValue(MOCK_TIER);
    reservationRepository.create.mockResolvedValue(MOCK_RESERVATION);

    await create(MOCK_USER, { event_id: 5, tier_id: 10 });

    expect(reservationRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 1, event_id: 5, tier_id: 10 }),
    );
  });

  it("throws NOT_FOUND when tier does not exist", async () => {
    tierRepository.findById.mockResolvedValue(null);

    await expect(create(MOCK_USER, { event_id: 5, tier_id: 999 })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(tierRepository.decrementCapacity).not.toHaveBeenCalled();
    expect(reservationRepository.create).not.toHaveBeenCalled();
  });

  it("throws VALIDATION_ERROR when tier does not belong to the event", async () => {
    tierRepository.findById.mockResolvedValue({ ...MOCK_TIER, event_id: 99 });

    await expect(create(MOCK_USER, { event_id: 5, tier_id: 10 })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });

    expect(tierRepository.decrementCapacity).not.toHaveBeenCalled();
    expect(reservationRepository.create).not.toHaveBeenCalled();
  });

  it("propagates CONFLICT from decrementCapacity without creating a reservation", async () => {
    tierRepository.findById.mockResolvedValue(MOCK_TIER);
    tierRepository.decrementCapacity.mockRejectedValue({
      status: 409,
      code: "CONFLICT",
      message: "Tier is sold out",
    });

    await expect(create(MOCK_USER, { event_id: 5, tier_id: 10 })).rejects.toMatchObject({
      code: "CONFLICT",
    });

    expect(reservationRepository.create).not.toHaveBeenCalled();
  });
});

// ── getById ───────────────────────────────────────────────────────────────────

describe("reservationService.getById", () => {
  it("returns the reservation for the owner", async () => {
    reservationRepository.findById.mockResolvedValue(MOCK_RESERVATION);

    const result = await getById(MOCK_USER, 99);
    expect(result).toEqual(MOCK_RESERVATION);
  });

  it("allows an admin to access any reservation", async () => {
    reservationRepository.findById.mockResolvedValue(MOCK_RESERVATION);
    const admin = { sub: 999, role: "admin", email: "admin@example.com" };

    await expect(getById(admin, 99)).resolves.toEqual(MOCK_RESERVATION);
  });

  it("throws FORBIDDEN when a non-owner non-admin requests it", async () => {
    reservationRepository.findById.mockResolvedValue(MOCK_RESERVATION); // user_id: 1
    const otherUser = { sub: 2, role: "user", email: "other@example.com" };

    await expect(getById(otherUser, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("throws NOT_FOUND when the reservation does not exist", async () => {
    reservationRepository.findById.mockResolvedValue(null);

    await expect(getById(MOCK_USER, 999)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── getQr ─────────────────────────────────────────────────────────────────────

describe("reservationService.getQr", () => {
  it("returns qr_code only", async () => {
    reservationRepository.findById.mockResolvedValue(MOCK_RESERVATION);

    const result = await getQr(MOCK_USER, 99);

    expect(result.qr_code).toBe("abc-uuid");
    expect(result.qr_data_url).toBeUndefined();
  });

  it("inherits access-control from getById (throws FORBIDDEN for non-owner)", async () => {
    reservationRepository.findById.mockResolvedValue(MOCK_RESERVATION);
    const otherUser = { sub: 2, role: "user", email: "other@example.com" };

    await expect(getQr(otherUser, 99)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(qrcode.toDataURL).not.toHaveBeenCalled();
  });
});
