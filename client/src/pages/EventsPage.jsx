import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';

function EventCard({ event }) {
  const soldOut = event.sold_out;
  return (
    <Link
      to={`/events/${event.id}`}
      className="group block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      {event.image_url && (
        <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
      )}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
            {event.title}
          </h2>
          {soldOut && (
            <span className="shrink-0 text-xs font-medium bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              Sold out
            </span>
          )}
        </div>
        {event.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{event.description}</p>
        )}
        <div className="mt-3 text-xs text-gray-400 space-y-0.5">
          {event.date && (
            <p>
              {new Date(event.date).toLocaleDateString(undefined, {
                dateStyle: 'medium',
              })}
            </p>
          )}
          {event.location && <p>{event.location}</p>}
        </div>
      </div>
    </Link>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get('/events')
      .then(({ data }) => setEvents(data.data))
      .catch(() => setError('Failed to load events. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading events…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold mb-8">Upcoming Events</h1>

      {events.length === 0 ? (
        <p className="text-gray-500 text-center py-20">No events scheduled yet. Check back soon.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
