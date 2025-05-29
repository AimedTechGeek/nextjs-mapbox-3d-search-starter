import React, { useRef, useEffect, useState } from 'react';
import mapboxgl, { Map } from 'mapbox-gl';
import * as turf from '@turf/turf';
import 'mapbox-gl/dist/mapbox-gl.css';

import { useCurrentLocation } from './useCurrentLocation';
import { coordinateToPlace, placeToCoordinate } from './getPlaceCoordinate';
import { getRoute, getAllRoutes } from './getRoute';
import { animateNavigation } from '../utils/animateNavigation';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

const MapAtCurrentLocation: React.FC = () => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<Map | null>(null);
    const { coords, error } = useCurrentLocation({ lng: 0, lat: 0 });
    const [zoom] = useState<number>(12);
    const [start, setStart] = useState('Am fort hechtsheim 17');
    const [end, setEnd] = useState('Peter-sander-strasse 41');

    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!mapRef.current) {
            mapRef.current = new mapboxgl.Map({
                container: mapContainerRef.current,
                style: 'mapbox://styles/mapbox/streets-v12',
                center: [coords.lng, coords.lat],
                zoom,
            });

            mapRef.current.addControl(new mapboxgl.NavigationControl());
        } else {
            // If map already exists, just update center when coords change
            mapRef.current.setCenter([coords.lng, coords.lat]);
        }

        const place = coordinateToPlace(coords.lng, coords.lat);
        console.log('Nearest Place:', place);

        // Add or move marker to current coords
        const marker = new mapboxgl.Marker()
            .setLngLat([coords.lng, coords.lat])
            .addTo(mapRef.current);

        return () => {
            marker.remove();
        };
    }, [coords, zoom]);

    useEffect(() => {
        if (error) {
            console.error('Geolocation error:', error);
        }
    }, [error]);

    const getDirections = async (startPlace: string, endPlace: string) => {
        const startCoords = await placeToCoordinate(startPlace);
        const endCoords = await placeToCoordinate(endPlace);

        if (!startCoords || !endCoords || !mapRef.current) return;

        // Fly to route start
        mapRef.current.flyTo({ center: [startCoords.lng, startCoords.lat], zoom: 12 });

        // Fetch directions
        const routes = await getAllRoutes(startCoords, endCoords);
        console.log('Routes:', routes);

        // Remove old layers if present
        const existingLayers = mapRef.current.getStyle().layers || [];
        for (const layer of existingLayers) {
            if (layer.id.startsWith('route-')) {
                if (mapRef.current.getLayer(layer.id)) {
                    mapRef.current.removeLayer(layer.id);
                }
                if (mapRef.current.getSource(layer.id)) {
                    mapRef.current.removeSource(layer.id);
                }
            }
        }

        routes.forEach((route, index) => {
            const routeId = `route-${index}`;

            console.log('Original route with', route.geometry.coordinates.length, 'points');

            const line = turf.lineString(route.geometry.coordinates);
            const densified = turf.lineChunk(line, 5, { units: 'meters' }); // split every 5 meters

            // flatten chunks back to coordinates
            const smoothCoords = densified.features.flatMap(f => f.geometry.coordinates) as [number, number][];
            console.log('Rewriting route with', smoothCoords.length, 'points');

            // Draw route
            mapRef.current.addSource(routeId, {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: "LineString",
                        coordinates: smoothCoords
                    },
                },
            });

            mapRef.current.addLayer({
                id: routeId,
                type: 'line',
                source: routeId,
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round',
                },
                paint: {
                    'line-color': index === 0 ? '#1D4ED8' : '#9CA3AF', // blue for main, gray for others
                    'line-width': index === 0 ? 5 : 3,
                    'line-opacity': index === 0 ? 1.0 : 0.6,
                },
            });

            animateNavigation(mapRef.current, smoothCoords);
        });
    };

    return (
        <>
            <div style={{ position: 'absolute', zIndex: 1, background: '#fff', padding: 8 }}>
                <input
                    type="text"
                    placeholder="Start location"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    style={{ marginRight: 8 }}
                />
                <input
                    type="text"
                    placeholder="End location"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    style={{ marginRight: 8 }}
                />
                <button onClick={() => getDirections(start, end)}>Get Route</button>
            </div>

            <div ref={mapContainerRef} style={{ height: '100vh' }} />
        </>
    );
};

export default MapAtCurrentLocation;
