import { View, Text, StyleSheet, FlatList, Button } from "react-native";
import type { ReactElement, ComponentType } from "react";
import { useFuel, FillUp } from "../state/useFuel";
import { deleteRemote } from "../lib/sync";

type Props = {
  ListHeaderComponent?: ReactElement | ComponentType<any> | null;
};

function Item({ f }: { f: FillUp }) {
  const delLocal = useFuel((s) => s.deleteFillUp);

  const onDelete = async () => {
    delLocal(f.id);
    try {
      await deleteRemote(f.id);
    } catch (e) {
      console.warn("deleteRemote:", (e as any)?.message || e);
    }
  };

  const d = new Date(f.date);
  const when = `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
  const total = f.liters * f.pricePerL;

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.main}>
          {f.type.toUpperCase()} • {f.liters.toFixed(2)} L • R$ {total.toFixed(2)}
        </Text>
        <Text style={styles.sub}>
          R$ {f.pricePerL.toFixed(2)}/L • {f.tankFull ? "Tanque cheio" : "Parcial"} • {when}
        </Text>
      </View>
      <Button title="Apagar" onPress={onDelete} />
    </View>
  );
}

export default function FillupsList({ ListHeaderComponent }: Props) {
  const list = useFuel((s) => s.fillups).slice().sort((a, b) => b.date - a.date);

  return (
    <FlatList
      data={list}
      keyExtractor={(f) => f.id}
      renderItem={({ item }) => <Item f={item} />}
      ListHeaderComponent={ListHeaderComponent}
      contentContainerStyle={{ gap: 10, paddingBottom: 40 }}
      ListEmptyComponent={
        <Text style={{ color: "#888", textAlign: "center", marginTop: 8 }}>
          Sem abastecimentos ainda
        </Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: "#141414",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#272727",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  main: { color: "#fff", fontWeight: "700" },
  sub: { color: "#bdbdbd", fontSize: 12, marginTop: 2 },
});
