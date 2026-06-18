jest.mock("../../repositories/userRepository");

const userRepository = require("../../repositories/userRepository");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { login } = require("../../services/authService");

const PASSWORD = "correct-password";
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 1); // cost 1 — fast in tests

const BASE_USER = {
  id: 42,
  email: "alice@example.com",
  password_hash: PASSWORD_HASH,
  role: "user",
};

beforeEach(() => jest.clearAllMocks());

describe("authService.login — success", () => {
  it("returns a signed JWT containing sub, email, and role", async () => {
    userRepository.findByEmail.mockResolvedValue(BASE_USER);

    const { token } = await login("alice@example.com", PASSWORD);

    expect(typeof token).toBe("string");
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    expect(payload.sub).toBe(42);
    expect(payload.email).toBe("alice@example.com");
    expect(payload.role).toBe("user");
  });

  it("token expires in roughly 8 hours", async () => {
    userRepository.findByEmail.mockResolvedValue(BASE_USER);

    const { token } = await login("alice@example.com", PASSWORD);
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const eightHours = 8 * 60 * 60;
    expect(payload.exp - payload.iat).toBe(eightHours);
  });

  it("calls userRepository.findByEmail with the provided email", async () => {
    userRepository.findByEmail.mockResolvedValue(BASE_USER);

    await login("alice@example.com", PASSWORD);

    expect(userRepository.findByEmail).toHaveBeenCalledWith("alice@example.com");
  });
});

describe("authService.login — wrong password", () => {
  it("throws UNAUTHORIZED without leaking which field is wrong", async () => {
    userRepository.findByEmail.mockResolvedValue(BASE_USER);

    await expect(login("alice@example.com", "wrong")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Invalid credentials",
    });
  });
});

describe("authService.login — unknown email", () => {
  it("throws UNAUTHORIZED", async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(login("nobody@example.com", PASSWORD)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("does not call bcrypt.compare when user is not found", async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    const spy = jest.spyOn(bcrypt, "compare");

    await expect(login("nobody@example.com", PASSWORD)).rejects.toBeDefined();

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
