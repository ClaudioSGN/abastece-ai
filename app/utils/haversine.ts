export type LatLon = { lat: number; lon: number };

export function haversineKm(a: LatLon, b: LatLon) {
    const R = 6371; // raio da Terra em KM
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b. lat * Math.PI) / 180;

    const s1 = Math.sin(dLat / 2) ** 2;
    const s2 = Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(s1 + s2));
}