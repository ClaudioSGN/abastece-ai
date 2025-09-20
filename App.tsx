// App.tsx
import { useEffect } from "react";
import { View, Text, Button, StatusBar, StyleSheet } from "react-native";

import { useAuth } from "./state/useAuth";
import Login from "./components/Login";
import FillupForm from "./components/FillupForm";
import FillupsList from "./components/FillupsList";
import Tracker from "./components/Tracker";
import { syncDownAll } from "./lib/sync";

export default function App() {
  const { user, loading, init, signOut } = useAuth();

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    if (user) {
      syncDownAll().catch((e) => console.warn("SyncDown:", e?.message || e));
    }
  }, [user]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <Text style={{ color: "#fff" }}>Carregando...</Text>
      </View>
    );
  }

  if (!user) return <Login />;

  const Header = () => (
    <View style={{ paddingBottom: 12 }}>
      <Tracker />
      <FillupForm />
      <Text style={{ color: "#CFCFCF", marginBottom: 8, fontWeight: "700" }}>Histórico</Text>
    </View>
  );

  return (
    <View style={styles.page}>
      <StatusBar barStyle="light-content" />

      <View style={[styles.row, { justifyContent: "space-between", marginBottom: 12 }]}>
        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>Abastece.Aí</Text>
        <View style={[styles.row, { gap: 8 }]}>
          <Button title="Sincronizar" onPress={() => syncDownAll()} />
          <Button title="Sair" onPress={signOut} />
        </View>
      </View>

      <FillupsList ListHeaderComponent={<Header />} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#0B0B0B", padding: 16, paddingTop: 40 },
  center: { flex: 1, backgroundColor: "#0B0B0B", justifyContent: "center", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center" },
});
