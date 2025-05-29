import { useState, useEffect } from 'react';
import { Coordinate } from '../utils/types';

export function useCurrentLocation(defaultCoords: Coordinate = { lng: 0, lat: 0 }) {
  const [coords, setCoords] = useState<Coordinate>(defaultCoords);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setCoords({
        lng: position.coords.longitude,
        lat: position.coords.latitude,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      setError(error.message);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError);

    // Optionally, you can add watchPosition for live updates here

  }, []);

  return { coords, error };
}
