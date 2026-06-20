import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { apiErrorCode } from '../lib/apiError';
import type { EventSummary, Tier } from '../types';

function TierRow({
  tier,
  onReserve,
  reserving,
}: {
  tier: Tier;
  onReserve: (id: number) => void;
  reserving: number | null;
}) {
  const available = tier.capacity - tier.sold_count;
  const soldOut = available <= 0;

  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{tier.name}</p>
        <p className="text-sm text-gray-400 mt-0.5">
          {soldOut ? 'Sold out' : `${available} of ${tier.capacity} available`}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-gray-900">
          {Number(tier.price) === 0 ? 'Free' : `$${Number(tier.price).toFixed(2)}`}
        </p>
        <button
          onClick={() => onReserve(tier.id)}
          disabled={soldOut || reserving === tier.id}
          className="mt-2 text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {reserving === tier.id ? 'Reserving…' : 'Reserve'}
        </button>
      </div>
    </div>
  );
}

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [event, setEvent] = useState<EventSummary | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reserving, setReserving] = useState<number | null>(null);
  const [reserveError, setReserveError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/events/${id}`).then(({ data }) => data.data),
      api.get(`/events/${id}/tiers`).then(({ data }) => data.data),
    ])
      .then(([eventData, tiersData]) => {
        if (!eventData) throw new Error('NOT_FOUND');
        setEvent(eventData);
        setTiers(tiersData);
      })
      .catch((err) => {
        const code = apiErrorCode(err);
        setError(code === 'NOT_FOUND' ? 'Event not found.' : 'Failed to load event.');
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleReserve(tierId: number) {
    if (!token) {
      navigate('/login', { state: { from: { pathname: `/events/${id}` } } });
      return;
    }
    setReserveError(null);
    setReserving(tierId);
    try {
      const { data } = await api.post('/reservations', {
        event_id: Number(id),
        tier_id: tierId,
      });
      navigate(`/reservations/${data.data.id}/confirm`);
    } catch (err) {
      const code = apiErrorCode(err);
      setReserveError(
        code === 'CONFLICT' ? 'This tier is sold out.' : 'Reservation failed. Please try again.',
      );
    } finally {
      setReserving(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 flex-col gap-4">
        <p className="text-red-500">{error}</p>
        <Link to="/events" className="text-sm text-indigo-600 hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <Link to="/events" className="text-sm text-indigo-600 hover:underline mb-6 inline-block">
        ← All events
      </Link>

      {event!.image_url && (
        <img
          src={event!.image_url}
          alt={event!.title}
          className="w-full h-56 object-cover rounded-2xl mb-6"
        />
      )}

      <h1 className="text-3xl font-bold text-gray-900">{event!.title}</h1>

      <div className="mt-2 text-sm text-gray-500 space-y-0.5">
        {event!.date && (
          <p>
            {new Date(event!.date).toLocaleDateString(undefined, {
              dateStyle: 'long',
            })}
          </p>
        )}
        {event!.location && <p>{event!.location}</p>}
      </div>

      {event!.description && (
        <p className="mt-4 text-gray-700 leading-relaxed">{event!.description}</p>
      )}

      <div className="mt-10">
        <h2 className="text-xl font-semibold mb-2">Tickets</h2>

        {reserveError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
            {reserveError}
          </p>
        )}

        {tiers.length === 0 ? (
          <p className="text-gray-500 py-8 text-center">No tickets available for this event.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 px-5 divide-y divide-gray-100">
            {tiers.map((tier) => (
              <TierRow key={tier.id} tier={tier} onReserve={handleReserve} reserving={reserving} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
