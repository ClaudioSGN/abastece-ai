import { useState } from "react";
import { View, Text, TextInput, Button, StyleSheet, Switch, Alert } from "react-native";
import { useFuel, FuelType } from "../state/useFuel";
import { pushFillup } from "../lib/sync";

export default function FillupForm() {
    const register = useFuel((s) => s.registerFillUp);
    const [liters, setLiters] = useState("");
    const [price, setPrice] = useState("");
    const [type, setType] = useState<FuelType>("gasolina");
    const [tankFull, setTankFull] = useState(false);

    function toNum(x: string) {
        return parseFloat((x || "0").replace(",", "."));
    }

    async function onSave() {
        const l = toNum(liters);
        const p = toNum(price);
        if (l <= 0 || p < 0) return Alert.alert("DAdos inválidos", "Preencha litros e o preço corretamente.");

        register({ liters: l, pricePerL: p, type, tankFull });

        const last = useFuel.getState().fillups.at(-1);
        if (last) {
            try {
                await pushFillup(last);
            } catch (e: any) {
                Alert.alert("Sincronização", e?.message || "Falhou ao enviar para a nuvem. Tente sincronizar depois.");
            }
        }

        setLiters("");
        setPrice("");
        setTankFull(false);
    }

    return (
        <View style={styles.card}>
            <Text style={styles.title}>Novo abastecimento</Text>

            <Text style={styles.label}>Litros</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={liters}
                onChangeText={setLiters}
                placeholder="ex.: 35,7"
                placeholderTextColor="#777"
            />

            <Text style={styles.label}>Preço por litro (R$)</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={price}
                onChangeText={setPrice}
                placeholder="ex.: 5,89"
                placeholderTextColor="#777"
            />

            <Text style={styles.label}>Tipo</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
                {(["gasolina", "etanol", "diesel"] as FuelType[]).map((t) => (
                    <Text
                        key={t}
                        onPress={() => setType(t)}
                        style={[
                            styles.chip,
                            type === t && { backgroundColor: "#2b7cff" },
                        ]}
                    >
                        {t}
                    </Text>
                ))}
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <Switch value={tankFull} onValueChange={setTankFull} />
                <Text style={{ color: "#ddd", marginLeft: 8 }}>Tanque cheio</Text>
            </View>

            <Button title="Salvar abastecimento" onPress={onSave} />
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: "#141414", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#272727"},
    title: { color: "#fff", fontWeight: "700", marginBottom: 8, fontSize: 16 },
    label: { color: "#CFCFCF", marginTop: 8, marginBottom: 4, fontSize: 12 },
    input: { borderWidth: 1, borderColor: "#333", backgroundColor: "#0f0f0f", color: "#fff", borderRadius: 8, padding: 10 },
    chip: { color: "#fff", backgroundColor: "#222", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden" },
});