import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import EventsPage from './EventsPage.jsx';
import api from '../api/client.js';

vi.mock('../api/client.js', () => ({ default: { get: vi.fn(), post: vi.fn() } }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <EventsPage />
    </MemoryRouter>,
  );

describe('EventsPage', () => {
  it('renders events and a sold-out badge', async () => {
    api.get.mockResolvedValue({
      data: {
        data: [
          { id: 1, title: 'Summer Gala', sold_out: false },
          { id: 2, title: 'Sold Show', sold_out: true },
        ],
      },
    });
    renderPage();

    expect(await screen.findByText('Summer Gala')).toBeInTheDocument();
    expect(screen.getByText('Sold Show')).toBeInTheDocument();
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no events', async () => {
    api.get.mockResolvedValue({ data: { data: [] } });
    renderPage();

    expect(await screen.findByText(/no events scheduled/i)).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    api.get.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText(/failed to load events/i)).toBeInTheDocument();
  });
});
