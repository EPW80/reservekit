import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.js';
import LoginPage from './pages/LoginPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import EventDetailPage from './pages/EventDetailPage.jsx';
import ReservationConfirmPage from './pages/ReservationConfirmPage.jsx';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/events" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/events" element={<EventsPage />} />
      <Route path="/events/:id" element={<EventDetailPage />} />
      <Route
        path="/reservations/:id/confirm"
        element={
          <ProtectedRoute>
            <ReservationConfirmPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          <div className="p-8 text-center">
            <h1 className="text-2xl font-semibold">404 — Not Found</h1>
          </div>
        }
      />
    </Routes>
  );
}
