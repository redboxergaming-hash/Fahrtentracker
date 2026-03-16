import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import DashboardPage from '../features/dashboard/DashboardPage';
import TripsPage from '../features/trips/TripsPage';
import VehicleCreatePage from '../features/vehicles/VehicleCreatePage';
import VehicleDetailPage from '../features/vehicles/VehicleDetailPage';
import VehicleEditPage from '../features/vehicles/VehicleEditPage';
import VehiclesPage from '../features/vehicles/VehiclesPage';
import PlaceholderPage from '../pages/PlaceholderPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/trips" element={<TripsPage />} />
        <Route path="/track" element={<PlaceholderPage title="Live Tracking" />} />
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
