import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from './AuthContext.jsx';
import { decodeValidToken } from './token.js';
import { useAuth } from '../hooks/useAuth.js';
import api from '../api/client.js';

vi.mock('../api/client.js', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

const now = () => Math.floor(Date.now() / 1000);
const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const makeToken = (payload) => `h.${b64url(payload)}.s`;

function Harness() {
  const { user, token, login, logout } = useAuth();
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'anon'}</span>
      <span data-testid="token">{token ? 'has-token' : 'no-token'}</span>
      <button onClick={() => login('a@b.c', 'pw')}>login</button>
      <button onClick={logout}>logout</button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Harness />
    </AuthProvider>,
  );

describe('decodeValidToken', () => {
  it('returns the payload for a non-expired token', () => {
    expect(decodeValidToken(makeToken({ email: 'x@y.z', exp: now() + 3600 }))?.email).toBe('x@y.z');
  });

  it('returns null for an expired token', () => {
    expect(decodeValidToken(makeToken({ email: 'x@y.z', exp: now() - 10 }))).toBeNull();
  });

  it('returns null for malformed or missing input', () => {
    expect(decodeValidToken('not-a-jwt')).toBeNull();
    expect(decodeValidToken(null)).toBeNull();
  });
});

describe('AuthProvider', () => {
  beforeEach(() => localStorage.clear());

  it('starts anonymous when nothing is stored', () => {
    renderProvider();
    expect(screen.getByTestId('user')).toHaveTextContent('anon');
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
  });

  it('hydrates the session from a valid stored token', () => {
    localStorage.setItem('rk_token', makeToken({ email: 'live@x.com', exp: now() + 3600 }));
    renderProvider();
    expect(screen.getByTestId('user')).toHaveTextContent('live@x.com');
  });

  it('ignores and removes an expired stored token', () => {
    localStorage.setItem('rk_token', makeToken({ email: 'old@x.com', exp: now() - 5 }));
    renderProvider();
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    expect(localStorage.getItem('rk_token')).toBeNull();
  });

  it('logs in (storing the token) and logs out (clearing it)', async () => {
    const jwt = makeToken({ email: 'a@b.c', exp: now() + 3600 });
    api.post.mockResolvedValue({ data: { data: { token: jwt } } });

    renderProvider();
    await userEvent.click(screen.getByText('login'));

    expect(await screen.findByText('a@b.c')).toBeInTheDocument();
    expect(localStorage.getItem('rk_token')).toBe(jwt);

    await userEvent.click(screen.getByText('logout'));
    expect(screen.getByTestId('user')).toHaveTextContent('anon');
    expect(localStorage.getItem('rk_token')).toBeNull();
  });
});
