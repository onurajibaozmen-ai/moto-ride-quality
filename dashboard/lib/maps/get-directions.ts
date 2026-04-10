export async function getDirectionsPath(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.error('Missing GOOGLE MAPS API KEY');
    return null;
  }

  const url = new URL(
    'https://maps.googleapis.com/maps/api/directions/json',
  );

  url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  url.searchParams.set(
    'destination',
    `${destination.lat},${destination.lng}`,
  );
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
    });

    const data = await res.json();

    if (!data.routes?.length) return null;

    return data.routes[0].overview_polyline.points;
  } catch (e) {
    console.error('Directions fetch error', e);
    return null;
  }
}