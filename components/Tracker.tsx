// components/Tracker.tsx
import { useEffect, useRef, useState } from "react";
import { View, Text, Button, StyleSheet } from "react-native";
import * as Location from "expo-location";
import { useFuel } from "../state/useFuel";
import { haversineKm } from "../app/utils/haversine"; // ajuste caminho se seu util estiver em outro lugar

type LatLon = { lat: number; lon: number; t: number };

const Tracker: React.FC = () => {
  const addDistance = useFuel((s) => s.addDistance);

  const [hasPerm, setHasPerm] = useState<boolean | null>(null);
  const [watching, setWatching] = useState(false);
  const [lastPoint, setLastPoint] = useState<LatLon | null>(null);
  const [sessionKm, setSessionKm] = useState(0);
  const [current, setCurrent] = useState<LatLon | null>(null);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);

  // pede permissão e pega o ponto inicial
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPerm(status === "granted");
      if (status !== "granted") return;

      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p: LatLon = {
        lat: first.coords.latitude,
        lon: first.coords.longitude,
        t: first.timestamp || Date.now(),
      };
      setCurrent(p);
      setLastPoint(p);
    })();

    return () => {
      watchSubRef.current?.remove();
    };
  }, []);

  const startWatching = async () => {
    if (!hasPerm || watchSubRef.current) return;

    const sub = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
      (loc) => {
        const now: LatLon = {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          t: loc.timestamp || Date.now(),
        };
        setCurrent(now);

        if (lastPoint) {
          const segKm = haversineKm(
            { lat: lastPoint.lat, lon: lastPoint.lon },
            { lat: now.lat, lon: now.lon }
          );
          if (segKm > 0 && segKm < 3) {
            setSessionKm((v) => v + segKm);
            addDistance(segKm);
          }
        }
        setLastPoint(now);
      }
    );

    watchSubRef.current = sub;
    setWatching(true);
  };

  const stopWatching = () => {
    watchSubRef.current?.remove();
    watchSubRef.current = null;
    setWatching(false);
  };

  const resetSession = () => {
    setSessionKm(0);
    if (current) setLastPoint(current);
  };

  const latTxt = current ? current.lat.toFixed(5) : "--";
  const lonTxt = current ? current.lon.toFixed(5) : "--";

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.label}>Local atual</Text>
        <Text style={styles.text}>Lat: {latTxt}</Text>
        <Text style={styles.text}>Lon: {lonTxt}</Text>
        {hasPerm === false && <Text style={styles.error}>Permissão de localização negada.</Text>}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Sessão (km desde que abriu o app)</Text>
        <Text style={styles.big}>{sessionKm.toFixed(3)} km</Text>
        <View style={styles.row}>
          {!watching ? (
            <Button title="Iniciar rastreamento" onPress={startWatching} />
          ) : (
            <Button title="Parar rastreamento" onPress={stopWatching} />
          )}
          <Button title="Zerar sessão" onPress={resetSession} />
        </View>
      </View>
    </>
  );
};

export default Tracker;

const styles = StyleSheet.create({
  card: {
    width: "100%",
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    backgroundColor: "#141414",
    marginBottom: 12,
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#CFCFCF" },
  big: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  text: { color: "#FFFFFF" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 8 },
  error: { color: "#FF6B6B", marginTop: 4 },
});
