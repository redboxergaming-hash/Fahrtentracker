import type { LatLngTuple } from 'leaflet';
import { MapContainer, CircleMarker, Polyline, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import type { RoutePoint } from '../../../types/models';
import type { TrackingPosition } from '../trackingTypes';

const DEFAULT_CENTER: LatLngTuple = [48.137154, 11.576124];
const DEFAULT_ZOOM = 13;

export function LiveTrackingMap({
  routePoints,
  currentPosition
}: {
  routePoints: RoutePoint[];
  currentPosition?: TrackingPosition;
}) {
  const routeLatLngs = useMemo<LatLngTuple[]>(
    () => routePoints.map((point) => [point.lat, point.lng]),
    [routePoints]
  );

  const currentLatLng = useMemo<LatLngTuple | undefined>(() => {
    if (currentPosition) {
      return [currentPosition.lat, currentPosition.lng];
    }

    const latestRoutePoint = routePoints[routePoints.length - 1];
    if (!latestRoutePoint) {
      return undefined;
    }

    return [latestRoutePoint.lat, latestRoutePoint.lng];
  }, [currentPosition, routePoints]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={currentLatLng ?? DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-72 w-full sm:h-80 lg:h-[24rem]"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewportController routeLatLngs={routeLatLngs} currentLatLng={currentLatLng} />

        {routeLatLngs.length >= 2 ? (
          <Polyline positions={routeLatLngs} pathOptions={{ color: '#0ea5e9', weight: 4, opacity: 0.9 }} />
        ) : null}

        {currentLatLng ? (
          <CircleMarker
            center={currentLatLng}
            radius={8}
            pathOptions={{ color: '#0369a1', weight: 2, fillColor: '#0ea5e9', fillOpacity: 0.9 }}
          />
        ) : null}
      </MapContainer>

      {!currentLatLng ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow">
          No location points yet. Start tracking to see your live route.
        </div>
      ) : null}
    </div>
  );
}

function MapViewportController({
  routeLatLngs,
  currentLatLng
}: {
  routeLatLngs: LatLngTuple[];
  currentLatLng?: LatLngTuple;
}) {
  const map = useMap();

  useEffect(() => {
    if (!currentLatLng) {
      return;
    }

    if (routeLatLngs.length >= 2) {
      map.fitBounds(routeLatLngs, { padding: [24, 24], maxZoom: 17 });
      return;
    }

    map.setView(currentLatLng, 16, { animate: true });
  }, [currentLatLng, map, routeLatLngs]);

  return null;
}
