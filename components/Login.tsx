import { useState } from "react";
import {
  View, Text, TextInput, Button, StyleSheet, Alert, Pressable, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { useAuth } from "../state/useAuth";

type Mode = "login" | "signup";

export default function Login() {
  const { signIn, signUp, loading } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");   // só no signup
  const [name, setName] = useState("");     // opcional, só no signup

  const isSignup = mode === "signup";

  function validateEmail(v: string) {
    return /\S+@\S+\.\S+/.test(v);
  }

  async function handleLogin() {
    if (!validateEmail(email)) return Alert.alert("Entrar", "Informe um e-mail válido.");
    if (pass.length < 6) return Alert.alert("Entrar", "Senha deve ter pelo menos 6 caracteres.");
    try {
      await signIn(email.trim(), pass);
    } catch (e: any) {
      Alert.alert("Entrar", e?.message || "Erro ao entrar");
    }
  }

  async function handleSignup() {
    if (!validateEmail(email)) return Alert.alert("Criar conta", "Informe um e-mail válido.");
    if (pass.length < 6) return Alert.alert("Criar conta", "Senha deve ter pelo menos 6 caracteres.");
    if (pass !== pass2) return Alert.alert("Criar conta", "As senhas não coincidem.");
    try {
      // usa a store (ela lida com session=null quando confirmação por e-mail é exigida)
      await signUp(email.trim(), pass);
      Alert.alert(
        "Conta criada",
        "Se o projeto exige confirmação por e-mail, verifique sua caixa de entrada. Depois é só Entrar."
      );
      setMode("login");
    } catch (e: any) {
      Alert.alert("Criar conta", e?.message || "Erro ao criar conta");
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Abastece.Aí</Text>
        <Text style={styles.subtitle}>{isSignup ? "Crie sua conta" : "Faça login para continuar"}</Text>

        {isSignup && (
          <>
            <Text style={styles.label}>Nome (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor="#777"
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />
          </>
        )}

        <Text style={styles.label}>E-mail</Text>
        <TextInput
          style={styles.input}
          placeholder="email@exemplo.com"
          placeholderTextColor="#777"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#777"
          secureTextEntry
          value={pass}
          onChangeText={setPass}
          returnKeyType={isSignup ? "next" : "done"}
        />

        {isSignup && (
          <>
            <Text style={styles.label}>Confirmar senha</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#777"
              secureTextEntry
              value={pass2}
              onChangeText={setPass2}
              returnKeyType="done"
            />
          </>
        )}

        <View style={{ gap: 8, marginTop: 12, width: "100%" }}>
          {isSignup ? (
            <Button title={loading ? "Criando..." : "Criar conta"} onPress={handleSignup} disabled={loading} />
          ) : (
            <Button title={loading ? "Entrando..." : "Entrar"} onPress={handleLogin} disabled={loading} />
          )}
        </View>

        <Pressable onPress={() => setMode(isSignup ? "login" : "signup")} style={{ marginTop: 14 }}>
          <Text style={styles.switchText}>
            {isSignup ? "Já tem conta? Entrar" : "Não tem conta? Criar conta"}
          </Text>
        </Pressable>

        {isSignup && (
          <Text style={styles.hint}>
            Dica: se as confirmações por e-mail estiverem ativas no Supabase, você vai receber um link para confirmar.
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: 24, backgroundColor: "#0B0B0B", justifyContent: "center" },
  title: { color: "#fff", fontSize: 26, fontWeight: "800", marginBottom: 6, textAlign: "center" },
  subtitle: { color: "#CFCFCF", textAlign: "center", marginBottom: 16 },
  label: { color: "#CFCFCF", marginTop: 6, marginBottom: 4, fontSize: 12 },
  input: {
    borderWidth: 1, borderColor: "#333", backgroundColor: "#141414",
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, color: "#fff",
  },
  switchText: { color: "#2b7cff", textAlign: "center", fontWeight: "600" },
  hint: { color: "#9A9A9A", fontSize: 12, textAlign: "center", marginTop: 10 },
});
