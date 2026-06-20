import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './LoginPage';
import { AuthProvider } from '../context/AuthContext';
import api from '../api/client';

vi.mock('../api/client', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
const mockPost = vi.mocked(api.post);

const jwt = `h.${btoa(JSON.stringify({ email: 'a@b.c', exp: Math.floor(Date.now() / 1000) + 3600 })).replace(/=/g, '')}.s`;

function renderLogin() {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/events" element={<div>EVENTS PAGE</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

describe('LoginPage', () => {
  it('renders the sign-in form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('logs in and navigates to events on success', async () => {
    mockPost.mockResolvedValue({ data: { data: { token: jwt } } } as any);
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('EVENTS PAGE')).toBeInTheDocument();
    expect(mockPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.c', password: 'secret' });
  });

  it('shows an error message when login fails', async () => {
    mockPost.mockRejectedValue({
      response: { data: { error: { message: 'Invalid credentials' } } },
    });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/email/i), 'a@b.c');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });
});
