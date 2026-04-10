import { BadRequestException, Injectable } from '@nestjs/common';

type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string | null;
  placeId: string | null;
};

@Injectable()
export class GeocodingService {
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

    if (!apiKey) {
      throw new BadRequestException(
        'GOOGLE_MAPS_SERVER_API_KEY is missing on server',
      );
    }

    if (!address || !address.trim()) {
      throw new BadRequestException('Address is required for geocoding');
    }

    const url = new URL(
      'https://maps.googleapis.com/maps/api/geocode/json',
    );
    url.searchParams.set('address', address.trim());
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new BadRequestException('Geocoding request failed');
    }

    const data = (await response.json()) as {
      status?: string;
      results?: Array<{
        formatted_address?: string;
        place_id?: string;
        geometry?: {
          location?: {
            lat?: number;
            lng?: number;
          };
        };
      }>;
      error_message?: string;
    };

    if (data.status !== 'OK' || !data.results?.length) {
      throw new BadRequestException(
        data.error_message || `Geocoding failed with status ${data.status}`,
      );
    }

    const first = data.results[0];
    const lat = first.geometry?.location?.lat;
    const lng = first.geometry?.location?.lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      throw new BadRequestException(
        'Geocoding result did not return valid coordinates',
      );
    }

    return {
      lat,
      lng,
      formattedAddress: first.formatted_address ?? null,
      placeId: first.place_id ?? null,
    };
  }
}