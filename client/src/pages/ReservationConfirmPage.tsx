import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import api from '../api/client';
import type { Reservation } from '../types';

export default function ReservationConfirmPage() {
  const { id } = useParams();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get(`/reservations/${id}`).then(({ data }) => data.data),
      api.get(`/reservations/${id}/qr`).then(({ data }) => data.data),
    ])
      .then(([res, qr]) => {
        setReservation(res);
        setQrCode(qr.qr_code);
      })
      .catch(() =>
        setError('Could not load your reservation. Please check your email or contact support.'),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 animate-pulse">Loading confirmation…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 flex-col gap-4">
        <p className="text-red-500 text-center">{error}</p>
        <Link to="/events" className="text-sm text-indigo-600 hover:underline">
          Back to events
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-6">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">You're in!</h1>
            <p className="text-sm text-gray-500 mt-1">Reservation confirmed</p>
          </div>

          <div className="text-left bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Reservation</span>
              <span className="font-mono text-xs text-gray-600">#{reservation!.id}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Status</span>
              <span className="font-medium text-gray-900 capitalize">{reservation!.status}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-gray-500">Date</span>
              <span className="text-gray-700">
                {new Date(reservation!.created_at).toLocaleDateString(undefined, {
                  dateStyle: 'medium',
                })}
              </span>
            </div>
          </div>

          {qrCode && (
            <div className="flex justify-center">
              <QRCodeSVG value={qrCode} size={180} level="M" />
            </div>
          )}

          <p className="text-xs text-gray-400">Show this QR code at the door to check in.</p>

          <Link
            to="/events"
            className="block w-full bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Browse more events
          </Link>
        </div>
      </div>
    </div>
  );
}
