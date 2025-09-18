import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Button, TextInput, Switch, Alert, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import * as Location from "expo-location";
import { haversineKm } from "./app/utils/haversine";
import { useFuel } from "./state/useFuel";
import { fmtBRL, fmtDate } from "./app/utils/format";
import Login from "./components/Login";
import { useAuth } from "./state/useAuth";

type LatLon = { lat: number; lon: number; t: number }; // t = timestamp ms

export default function App() {

  const { user, loading, init, signOut } = useAuth();

  useEffect(() => {
    init();
  }, []);

  // ====== STORE (estado global persistente) ======
  const tankL = useFuel((s) => s.tankL);
  const setTankL = useFuel((s) => s.setTankL);
  const odoKm = useFuel((s) => s.odoKm);
  const fuelLeftL = useFuel((s) => s.fuelLeftL);
  const avgKmPerL = useFuel((s) => s.avgKmPerL);
  const setAvg = useFuel((s) => s.setAvg);
  const addDistance = useFuel((s) => s.addDistance);
  const registerFillUp = useFuel((s) => s.registerFillUp);
  const fillups = useFuel((s) => s.fillups);

  // ====== ESTADO LOCAL (tela atual) ======
  const [hasPerm, setHasPerm] = useState<boolean | null>(null);
  const [watching, setWatching] = useState(false);
  const [lastPoint, setLastPoint] = useState<LatLon | null>(null);
  const [sessionKm, setSessionKm] = useState(0);
  const [current, setCurrent] = useState<LatLon | null>(null);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);

  // form de abastecimento
  const [litersStr, setLitersStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [type, setType] = useState<"gasolina" | "etanol" | "diesel">("gasolina");
  const [tankFull, setTankFull] = useState(true);

  // ====== PERMISSÃO INICIAL ======
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPerm(status === "granted");
      if (status !== "granted") return;
      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p: LatLon = { lat: first.coords.latitude, lon: first.coords.longitude, t: first.timestamp || Date.now() };
      setCurrent(p);
      setLastPoint(p);
    })();
  }, []);

  // ====== WATCHER (rastreamento com app aberto) ======
  async function startWatching() {
    if (!hasPerm) return;
    if (watchSubRef.current) return; // evita duplicar

    const sub = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10, // 10m para teste; depois podemos subir para 30~50m
      },
      (loc) => {
        const now: LatLon = {
          lat: loc.coords.latitude,
          lon: loc.coords.longitude,
          t: loc.timestamp || Date.now(),
        };
        setCurrent(now);

        if (lastPoint) {
          const segKm = haversineKm({ lat: lastPoint.lat, lon: lastPoint.lon }, { lat: now.lat, lon: now.lon });
          if (segKm > 0 && segKm < 3) {
            setSessionKm((prev) => prev + segKm); // só para exibição da sessão
            addDistance(segKm); // ===== atualiza hodômetro e combustível estimado =====
          }
        }
        setLastPoint(now);
      }
    );

    watchSubRef.current = sub;
    setWatching(true);
  }

  function stopWatching() {
    watchSubRef.current?.remove();
    watchSubRef.current = null;
    setWatching(false);
  }

  function resetSession() {
    setSessionKm(0);
    if (current) setLastPoint(current);
  }

  // ====== DERIVADOS ======
  const autonomiaKm = Math.max(0, fuelLeftL * Math.max(1, avgKmPerL));
  const latTxt = current ? current.lat.toFixed(5) : "--";
  const lonTxt = current ? current.lon.toFixed(5) : "--";

  // ====== Ações de formulário ======
  function onSaveFillup() {
    const liters = parseFloat(litersStr.replace(",", "."));
    const pricePerL = parseFloat(priceStr.replace(",", "."));
    if (!isFinite(liters) || liters <= 0) {
      Alert.alert("Abastecimento", "Informe os litros (> 0).");
      return;
    }
    if (!isFinite(pricePerL) || pricePerL <= 0) {
      Alert.alert("Abastecimento", "Informe o preço por litro (> 0).");
      return;
    }
    registerFillUp({ liters, pricePerL, type, tankFull });
    setLitersStr("");
    setPriceStr("");
    Alert.alert("Abastecimento", "Registro salvo!");
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0B0B0B" }}>
        <Text style={{ color: "#fff" }}>Carregando...</Text>
      </View>
    )
  }

  if (!user) {
    return <Login />;
  }

  <View style={[styles.row, { justifyContent: "flex-end" }]}>
    <Button title="Sair" onPress={signOut} />
  </View>

  return (
  <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80} // ajusta se o header do iPhone cobrir algo
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.title}>Abastece.Aí — MVP</Text>

        {hasPerm === false && <Text style={styles.error}>Permissão de localização negada.</Text>}

        <View style={styles.card}>
          <Text style={styles.label}>Local atual</Text>
          <Text style={styles.text}>Lat: {latTxt}</Text>
          <Text style={styles.text}>Lon: {lonTxt}</Text>
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

        <View style={styles.card}>
          <Text style={styles.label}>Hodômetro do app</Text>
          <Text style={styles.big}>{odoKm.toFixed(2)} km</Text>
          <Text style={styles.text}>Combustível atual: {fuelLeftL.toFixed(1)} L</Text>
          <Text style={styles.text}>Consumo médio: {avgKmPerL.toFixed(1)} km/L</Text>
          <Text style={styles.text}>Autonomia estimada: {autonomiaKm.toFixed(0)} km</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Veículo</Text>
          <Text style={styles.text}>Capacidade do tanque (L):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="50"
            placeholderTextColor="#777"
            value={String(tankL)}
            onChangeText={(t) => setTankL(parseFloat((t || "0").replace(",", ".")) || 0)}
            returnKeyType="done"
          />
          <Text style={[styles.text, { marginTop: 8 }]}>Ajustar consumo médio (opcional):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="11 (km/L)"
            placeholderTextColor="#777"
            value={String(avgKmPerL)}
            onChangeText={(t) => setAvg(parseFloat((t || "0").replace(",", ".")) || 0)}
            returnKeyType="done"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Registrar abastecimento</Text>

          <Text style={styles.text}>Tipo:</Text>
          <View style={[styles.row, { marginBottom: 8, flexWrap: "wrap" }]}>
            {(["gasolina", "etanol", "diesel"] as const).map((opt) => (
              <Text
                key={opt}
                onPress={() => setType(opt)}
                style={[styles.chip, type === opt && { backgroundColor: "#2b7cff" }]}
              >
                {opt}
              </Text>
            ))}
          </View>

          <Text style={styles.text}>Litros abastecidos:</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="ex.: 38.5"
            placeholderTextColor="#777"
            value={litersStr}
            onChangeText={setLitersStr}
            returnKeyType="done"
          />

          <Text style={styles.text}>Preço por litro (R$):</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="ex.: 6.39"
            placeholderTextColor="#777"
            value={priceStr}
            onChangeText={setPriceStr}
            returnKeyType="done"
          />

          <View style={[styles.row, { alignItems: "center", marginVertical: 8 }]}>
            <Switch value={tankFull} onValueChange={setTankFull} />
            <Text style={[styles.text, { marginLeft: 8 }]}>Tanque cheio</Text>
          </View>

          <Button title="Salvar abastecimento" onPress={onSaveFillup} />
          <Text style={styles.tip}>
            Dica: o consumo médio real só é recalculado quando você marca “Tanque cheio” e já existe um abastecimento
            “cheio” anterior.
          </Text>
        </View>

        {/* Espaço extra pro último card não grudar no canto com o teclado aberto */}
        <View style={styles.card}>
          <Text style={styles.label}>HIstórico de abastecimentos</Text>

          {fillups.length === 0 ? (
            <Text style={styles.text}>Sem registros ainda. Salve um abastecimento acima 👆</Text>
          ) : (
            fillups
              .slice() // Cópia
              .reverse() // Mais recente primeiro
              .map((f) => {
                const total = f.liters * f.pricePerL;
                return (
                  <View key={f.id} style={styles.itemRow}>
                    <Text style={{ flex: 1 }}>
                      {fmtDate(f.date)} * {f.type}{f.tankFull ? " • cheio " : ""}
                    </Text>
                    <Text style={styles.itemTitle}>
                      {f.liters.toFixed(2)} L × {fmtBRL(f.pricePerL)} = {fmtBRL(total)}
                    </Text>
                      <Text style={styles.textSmall}>Odômetro app: {f.odoKm.toFixed(2)} km</Text>
                    </View>
                );
              })
          )}
        </View>
        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#0B0B0B" },
  scroll: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4, color: "#FFFFFF" },
  error: { color: "#FF6B6B" },
  row: { flexDirection: "row", gap: 12, marginTop: 8, flexWrap: "wrap" },
  card: {
    width: "100%",
    padding: 14,
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 12,
    backgroundColor: "#141414",
  },
  label: { fontWeight: "700", marginBottom: 6, color: "#CFCFCF" },
  big: { fontSize: 20, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  text: { color: "#FFFFFF" },
  tip: { marginTop: 10, fontSize: 12, color: "#9A9A9A", textAlign: "center" },
  input: {
    borderWidth: 1, borderColor: "#3a3a3a", borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8, color: "#fff", marginTop: 4,
  },
  chip: {
    color: "#fff", borderWidth: 1, borderColor: "#3a3a3a",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, overflow: "hidden",
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#2A2A2A",
  },
  itemTitle: { color: "#FFF", fontWeight: "700", marginBottom: 2 },
  textSmall: { color: "#CFCFCF", fontSize: 12 },
});

