// lib/supabase.ts
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

// pega o extra do app.json (SDKs novos: expoConfig; antigos: manifest)
const extra =
  (Constants.expoConfig?.extra as any) ??
  (Constants as any).manifest?.extra ??
  {} as any;

const supabaseUrl = extra.supabaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = extra.supabaseAnonKey ?? process.env.EXPO__PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase não configurado. Defina supabaseUrl e supabaseAnonKey em expo.extra (app.json) ou via EXPO_PUBLIC_*."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // RN não usa URLs de callback
  },
});
