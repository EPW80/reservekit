# 3. JWT stored in localStorage (for now)

Date: 2026-06-18
Status: Accepted

## Context

The SPA authenticates by storing the login JWT under the `rk_token` key in
`localStorage` (`client/src/context/token.js`, `client/src/api/client.js`). The
WordPress plugin (`wp-plugin/reservekit.js`) reads the **same** `rk_token` key to
authorize reservation requests — the two front ends deliberately share one token
so a logged-in SPA session also works inside an embedded widget.

`localStorage` is readable by any JavaScript on the page, so a successful XSS
attack could exfiltrate the token. The common hardening is to move the JWT into an
`HttpOnly`, `Secure`, `SameSite` cookie that scripts cannot read. That is not a
drop-in change here:

- The API would have to set and clear the cookie on login/logout, and read it on
  each request instead of the `Authorization: Bearer` header.
- Cookie auth reintroduces CSRF exposure, so we'd need a CSRF strategy
  (`SameSite=strict` plus a token) we don't have today.
- The WordPress plugin runs on a **different origin** from the API. A first-party
  `HttpOnly` cookie would not be sent cross-origin, so the shared-token model
  breaks unless we redesign how the widget authenticates.

## Decision

Keep the JWT in `localStorage` for now, and reduce the blast radius rather than
change the storage model:

- **Shrink the XSS surface** — `helmet`'s Content-Security-Policy is enabled on
  the API (ADR-relevant Phase 1 work); keep dependencies patched.
- **Limit token lifetime** — JWTs expire in 8h, and the client now refuses to use
  an expired or malformed token (`decodeValidToken` in `client/src/context/token.js`).
- **Fail closed on 401** — the axios interceptor clears the token and redirects to
  `/login` when the API rejects it.

The `HttpOnly`-cookie migration is explicitly deferred, not rejected.

## Consequences

- A token-stealing XSS remains possible in principle; the mitigations above limit
  the window and require a separate vulnerability to land first.
- When we revisit this, it must be sequenced as its own change that updates the
  API auth flow, adds CSRF protection, and redefines how the cross-origin
  WordPress widget authenticates (likely its own short-lived token exchange) —
  reopen this ADR rather than amending it in passing.
