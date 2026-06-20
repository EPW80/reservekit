import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from './EventsPage';
import api from '../api/client';

vi.mock('../api/client', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const mockGet = vi.mocked(api.get);

const renderPage = () =>
  render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>,
  );

describe('EventsPage', () => {
  it('renders events and a sold-out badge', async () => {
    mockGet.mockResolvedValue({
      data: {
        data: [
          { id: 1, title: 'Summer Gala', sold_out: false },
          { id: 2, title: 'Sold Show', sold_out: true },
        ],
      },
    } as any);
    renderPage();

    expect(await screen.findByText('Summer Gala')).toBeInTheDocument();
    expect(screen.getByText('Sold Show')).toBeInTheDocument();
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no events', async () => {
    mockGet.mockResolvedValue({ data: { data: [] } } as any);
    renderPage();

    expect(await screen.findByText(/no events scheduled/i)).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText(/failed to load events/i)).toBeInTheDocument();
  });
});
