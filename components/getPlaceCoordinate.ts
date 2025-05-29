import axios from 'axios';
import { Coordinate } from '../utils/types';

export async function placeToCoordinate(place: string): Promise<Coordinate> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error('Mapbox access token not found');
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${accessToken}`;

  try {
    const response = await axios.get(url);
    const features = response.data.features;

    if (features.length === 0) {
      throw new Error('No location found');
    }

    const [lng, lat] = features[0].center;
    return {lng, lat};
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

export async function coordinateToPlace(lng: number, lat: number): Promise<string | null> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  if (!accessToken) throw new Error('Missing Mapbox access token');

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}&limit=1`;

  try {
    const res = await axios.get(url);
    const place = res.data.features[0]?.place_name;
    return place || null;
  } catch (err) {
    console.error('Reverse geocoding failed:', err);
    return null;
  }
}
