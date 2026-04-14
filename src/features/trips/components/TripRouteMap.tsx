import type { LatLngTuple } from 'leaflet';
import { CircleMarker, MapContainer, Polyline, TileLayer, useMap } from 'react-leaflet';
import { useEffect, useMemo } from 'react';
import type { RoutePoint } from '../../../types/models';
import { getSpeedBandColor } from '../../track/speedLegend';
import { buildRenderableGroupedSpeedSegments } from '../../track/routeSpeedSegmentation';
import { NEUTRAL_ROUTE_PATH_OPTIONS, SPEED_ROUTE_PATH_OPTIONS } from '../../track/speedRouteUx';

const DEFAULT_CENTER: LatLngTuple = [48.137154, 11.576124];

export function TripRouteMap({ routePoints }: { routePoints: RoutePoint[] }) {
  const latLngs = useMemo<LatLngTuple[]>(() => routePoints.map((point) => [point.lat, point.lng]), [routePoints]);
  const groupedSegments = useMemo(() => buildRenderableGroupedSpeedSegments(routePoints), [routePoints]);
  const groupedLatLngs = useMemo(
    () => groupedSegments.map((segment) => segment.points.map((point) => [point.lat, point.lng] as LatLngTuple)),
    [groupedSegments]
  );

  const start = latLngs[0];
  const end = latLngs[latLngs.length - 1];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer center={start ?? DEFAULT_CENTER} zoom={13} className="h-64 w-full sm:h-80" scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitTripRouteBounds latLngs={latLngs} />

        {groupedSegments.length > 0
          ? groupedSegments.map((segment, index) => (
              <Polyline
                key={`${segment.speedBand}-${index}`}
                positions={groupedLatLngs[index]}
                pathOptions={{ ...SPEED_ROUTE_PATH_OPTIONS, color: getSpeedBandColor(segment.colorToken) }}
              />
            ))
          : latLngs.length >= 2
            ? <Polyline positions={latLngs} pathOptions={NEUTRAL_ROUTE_PATH_OPTIONS} />
            : null}

        {start ? (
          <CircleMarker
            center={start}
            radius={7}
            pathOptions={{ color: '#0f766e', weight: 2, fillColor: '#10b981', fillOpacity: 0.9 }}
          />
        ) : null}

        {end ? (
          <CircleMarker
            center={end}
            radius={7}
            pathOptions={{ color: '#9f1239', weight: 2, fillColor: '#f43f5e', fillOpacity: 0.9 }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}

function FitTripRouteBounds({ latLngs }: { latLngs: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    if (latLngs.length >= 2) {
      map.fitBounds(latLngs, { padding: [24, 24], maxZoom: 17 });
      return;
    }

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 16, { animate: true });
    }
  }, [latLngs, map]);

  return null;
}
