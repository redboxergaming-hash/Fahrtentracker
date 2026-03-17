import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import DashboardPage from '../features/dashboard/DashboardPage';
import ManualTripCreatePage from '../features/trips/ManualTripCreatePage';
import ManualTripEditPage from '../features/trips/ManualTripEditPage';
import TripDetailPage from '../features/trips/TripDetailPage';
import TripsPage from '../features/trips/TripsPage';
import VehicleCreatePage from '../features/vehicles/VehicleCreatePage';
import VehicleDetailPage from '../features/vehicles/VehicleDetailPage';
import VehicleEditPage from '../features/vehicles/VehicleEditPage';
import VehiclesPage from '../features/vehicles/VehiclesPage';
import TrackPage from '../features/track/TrackPage';
import PlaceholderPage from '../pages/PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/trips/:tripId" element={<TripDetailPage />} />
        <Route path="/trips/new" element={<ManualTripCreatePage />} />
        <Route path="/trips/:tripId/edit" element={<ManualTripEditPage />} />
        <Route path="/track" element={<TrackPage />} />
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/vehicles/new" element={<VehicleCreatePage />} />
        <Route path="/vehicles/:vehicleId/edit" element={<VehicleEditPage />} />
        <Route path="/vehicles/:vehicleId" element={<VehicleDetailPage />} />
        <Route path="/fuel" element={<PlaceholderPage title="Fuel" />} />
        <Route path="/stats" element={<PlaceholderPage title="Stats" />} />
        <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
