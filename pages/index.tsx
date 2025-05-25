import React, { useEffect, useRef, useState } from 'react';
import 'mapbox-gl/dist/mapbox-gl.css';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export default function Home() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [lng, setLng] = useState(-74.006);
  const [lat, setLat] = useState(40.7128);
  const [zoom, setZoom] = useState(12);
  const [searchTerm, setSearchTerm] = useState('');

  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');


  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current!,
      style: 'mapbox://styles/mapbox/navigation-day-v1', // satellite + streets labels
      center: [lng, lat],
      zoom: zoom,
      pitch: 60,
      bearing: -17.6,
      antialias: true,
    });

    map.current.on('load', () => {
      map.current!.scrollZoom.enable(); // enable scroll zoom if not already
      map.current!.scrollZoom.setZoomRate(0.1);      // lower = smoother
      map.current!.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.terrain-rgb',
        tileSize: 512,
        //maxzoom: 14,
      });
      map.current!.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

      map.current!.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });

      map.current!.addLayer({
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        //minzoom: 15,
        paint: {
          'fill-extrusion-color': '#aaa',
          'fill-extrusion-height': ['get', 'height'],
          'fill-extrusion-base': ['get', 'min_height'],
          'fill-extrusion-opacity': 0.6,
        },
      });
    });

    map.current.on('move', () => {
      setLng(map.current!.getCenter().lng.toFixed(4));
      setLat(map.current!.getCenter().lat.toFixed(4));
      setZoom(map.current!.getZoom().toFixed(2));
    });
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;

    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchTerm
      )}.json?access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      map.current?.flyTo({
        center: [lng, lat],
        zoom: 15,
        pitch: 60,
        bearing: 0,
        speed: 1.6,
        curve: 1,
      });
    } else {
      alert('Location not found');
    }
  };

  const getCoordinates = async (place: string) => {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(place)}.json?access_token=${mapboxgl.accessToken}`
    );
    const data = await res.json();
    return data.features?.[0]?.center;
  };

  const animateMarker = (routeCoords: [number, number][], speedKmh: number) => {
    if (!map.current) {
      console.warn('Map is not initialized yet');
      return;
    }

    const marker = new mapboxgl.Marker({ color: '#d00' }).setLngLat(routeCoords[0]).addTo(map.current!);

    let i = 0;
    const speedMps = (speedKmh * 1000) / 3600; // convert to meters per second
    const animationInterval = 100; // ms
    const distancePerFrame = speedMps * (animationInterval / 1000); // meters/frame

    const move = () => {
      console.log('Moving along the route..', i);

      if (i >= routeCoords.length - 1) {
        console.log('Animation complete');
        return;
      }

      const markerPos = marker.getLngLat();;
      const [toLng, toLat] = routeCoords[i + 1];
      const from = turf.point([markerPos.lng, markerPos.lat]);
      const to = turf.point([toLng, toLat]);
      const dist = turf.distance(from, to, { units: 'meters' });

      //console.log('dist to next:', dist);
      //console.log('distancePerFrame:', distancePerFrame);

      const direction = turf.bearing(from, to);
      if (dist < distancePerFrame) {
        i++;
        marker.setLngLat([toLng, toLat]);

      } else {
        const nextPoint = turf.destination(from, distancePerFrame, direction, { units: 'meters' });
        //console.log('Next point:', nextPoint.geometry.coordinates);
        marker.setLngLat(nextPoint.geometry.coordinates as [number, number]);
      }

      // Update camera to follow and rotate toward movement direction
      map.current.easeTo({
        center: marker.getLngLat(),
        bearing: direction,
        //zoom: 20,
        pitch: 60,
        duration: 500,  // smooth transition to new angle and center
        easing: t => t,
      });
      requestAnimationFrame(move);
    };

    move();
  };

  const getDirections = async (e: React.FormEvent) => {
    e.preventDefault();
    const startCoords = await getCoordinates(start);
    const endCoords = await getCoordinates(end);
    const directionsRes = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords[0]},${startCoords[1]};${endCoords[0]},${endCoords[1]}?geometries=geojson&overview=full&access_token=${mapboxgl.accessToken}`
    );
    const directionsData = await directionsRes.json();
    const route = directionsData.routes[0].geometry;

    // Draw the route on the map
    const mapbox = map.current!;
    const routeId = 'route-layer';

    // Remove previous route layer if it exists
    if (mapbox.getLayer(routeId)) {
      mapbox.removeLayer(routeId);
    }
    if (mapbox.getSource('route')) {
      mapbox.removeSource('route');
    }

    // Add new route as GeoJSON source and line layer
    mapbox.addSource('route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: route,
      },
    });

    mapbox.addLayer({
      id: routeId,
      type: 'line',
      source: 'route',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#3b9ddd',
        'line-width': 5,
      },
    });

    // Zoom and center on the start location
    mapbox.flyTo({ center: startCoords, zoom: 12 });

    // Simulate travel at 30 km/h

    map.current.easeTo({
      pitch: 60,      // tilt camera 60 degrees
      bearing: 45,    // rotate map 45 degrees clockwise
      //zoom: 16,
      duration: 2000, // smooth transition in ms
    });

    const routeCoords = route.coordinates as [number, number][];
    console.log('Original route with', routeCoords.length, 'points');
    //console.log(routeCoords);

    const line = turf.lineString(routeCoords);
    const densified = turf.lineChunk(line, 10, { units: 'meters' }); // split every 10 meters

    // flatten chunks back to coordinates
    const smoothCoords = densified.features.flatMap(f => f.geometry.coordinates) as [number, number][];
    console.log('Animating route with', smoothCoords.length, 'points');
    //console.log(smoothCoords);
    animateMarker(smoothCoords, 20);

  };

  return (
    <div style={{ height: '100vh', position: 'relative' }}>
      <form
        onSubmit={handleSearch}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 1,
          background: 'white',
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        <input
          type="text"
          placeholder="Search location"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '6px 8px', width: '250px' }}
        />
        <button type="submit" style={{ marginLeft: '8px', padding: '6px 12px' }}>
          Search
        </button>
      </form>

      <form
        onSubmit={getDirections}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 1,
          background: 'white',
          padding: '8px',
          borderRadius: '4px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        }}
      >
        <input
          type="text"
          placeholder="Start location"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          style={{ padding: '6px 8px', width: '200px' }}
        />
        <input
          type="text"
          placeholder="End location"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          style={{ padding: '6px 8px', marginLeft: '6px', width: '200px' }}
        />
        <button type="submit" style={{ marginLeft: '8px', padding: '6px 12px' }}>
          Get Directions
        </button>
      </form>

      <div ref={mapContainer} style={{ height: '100%', width: '100%' }} id="map" />
    </div>
  );
}