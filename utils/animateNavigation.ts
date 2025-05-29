import mapboxgl, { Map } from 'mapbox-gl';
import * as turf from '@turf/turf';

function calculateBearing(start: [number, number], end: [number, number]) {
    return turf.bearing(turf.point(start), turf.point(end));
}

export function animateNavigation(
    map: mapboxgl.Map,
    coords: [number, number][],
    speedKmph: number = 30
) {
    if (coords.length < 2) return;

    console.log('Animate with co-ordinates:', coords);
    const marker = new mapboxgl.Marker({ color: 'red' })
        .setLngLat(coords[0])
        .addTo(map);

    let index = 0;
    const totalSteps = coords.length;

    const animate = () => {
        if (index >= totalSteps - 1) return;

        const start = coords[index];
        const end = coords[index + 1];
        const distance = turf.distance(turf.point(start), turf.point(end));
        const duration = (distance / speedKmph) * 3600 * 1000;

        let startTime: number;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const t = Math.min(elapsed / duration, 1);

            console.log(start, end);
            const lng = start[0] + (end[0] - start[0]) * t;
            const lat = start[1] + (end[1] - start[1]) * t;

            if (!lat || !lng) {
                console.log('Wrong coordinate:[', lng, lat, ']');

            } else {
                marker.setLngLat([lng, lat]);

                map.easeTo({
                    center: [lng, lat],
                    bearing: calculateBearing(start, end),
                    pitch: 60,
                    duration: 0,
                });
            }
            if (t < 1) {
                requestAnimationFrame(step);
            } else {
                index++;
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(step);
    };

    animate();
}
