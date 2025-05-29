import axios from "axios";
import { Coordinate } from "../utils/types";

export async function getRoute(start: Coordinate, end: Coordinate): Promise<[number, number][]> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Mapbox access token is not defined in environment variables");
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?geometries=geojson&overview=full&access_token=${accessToken}`;

  try {
    const response = await axios.get(url);
    const coords = response.data.routes[0].geometry.coordinates as [number, number][];
    return coords;
  } catch (error) {
    console.error("Failed to fetch route:", error);
    throw error;
  }
}

export async function getAllRoutes(start: Coordinate, end: Coordinate): Promise<any[]> {
  const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Mapbox access token is not defined in environment variables");
  }

  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${start.lng},${start.lat};${end.lng},${end.lat}?alternatives=true&geometries=geojson&overview=full&access_token=${accessToken}`;

  try {
    const response = await axios.get(url);
    return response.data.routes;
  } catch (error) {
    console.error("Failed to fetch route:", error);
    throw error;
  }
}
