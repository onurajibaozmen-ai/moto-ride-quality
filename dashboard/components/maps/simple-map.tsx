'use client';

import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
} from '@react-google-maps/api';

type MarkerItem = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  title?: string;
};

type SimpleMapProps = {
  markers: MarkerItem[];
  path?: Array<{ lat: number; lng: number }>;
  height?: number;
};

const libraries: never[] = [];

function getCenter(markers: MarkerItem[]) {
  if (!markers.length) {
    return { lat: 41.0082, lng: 28.9784 };
  }

  const lat =
    markers.reduce((sum, item) => sum + item.lat, 0) / markers.length;
  const lng =
    markers.reduce((sum, item) => sum + item.lng, 0) / markers.length;

  return { lat, lng };
}

export default function SimpleMap({
  markers,
  path,
  height = 360,
}: SimpleMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey ?? '',
    libraries,
  });

  if (!apiKey) {
    return (
      <div
        className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"
        style={{ minHeight: `${height}px` }}
      >
        Google Maps API key bulunamadı.
        <br />
        <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> eklemelisin.
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800"
        style={{ minHeight: `${height}px` }}
      >
        Google Maps yüklenemedi.
        <br />
        API key, referrer veya billing ayarlarını kontrol et.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
        style={{ minHeight: `${height}px` }}
      >
        Harita yükleniyor...
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <GoogleMap
        mapContainerStyle={{
          width: '100%',
          height: '100%',
          minHeight: '320px',
          borderRadius: '16px',
        }}
        center={getCenter(markers)}
        zoom={12}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
        }}
      >
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            position={{ lat: marker.lat, lng: marker.lng }}
            label={marker.label}
            title={marker.title}
          />
        ))}

        {path && path.length > 1 ? (
          <Polyline
            path={path}
            options={{
              strokeOpacity: 0.9,
              strokeWeight: 4,
            }}
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}