// state/useAuth.ts
import { create } from "zustand";
import type { Session, User, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { useFuel } from "./useFuel";

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  loading: true,

  init: async () => {
    // pega sessão atual (se existir)
    const { data, error } = await supabase.auth.getSession();
    if (error) console.warn("getSession error:", error.message);
    set({
      session: data.session ?? null,
      user: data.session?.user ?? null,
      loading: false,
    });

    // controla troca de usuário
    let currentUserId = data.session?.user?.id ?? null;

    // observa mudanças de auth
    const { data: sub } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        set({
          session: newSession ?? null,
          user: newSession?.user ?? null,
          loading: false,
        });

        const nextUserId = newSession?.user?.id ?? null;
        // limpa dados locais se saiu ou trocou de usuário
        if (event === "SIGNED_OUT" || (event === "SIGNED_IN" && nextUserId !== currentUserId)) {
          try {
            useFuel.getState().resetAll();
          } catch (e) {
            console.warn("resetAll falhou:", e);
          }
        }
        currentUserId = nextUserId;
      }
    );

    // Dica: se um dia quiser "desinscrever", use:
    // sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { set({ loading: false }); throw error; }
    set({ session: data.session ?? null, user: data.user ?? null, loading: false });
  },

  signUp: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { set({ loading: false }); throw error; }
    set({ session: data.session ?? null, user: data.user ?? null, loading: false });
  },

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    try {
      useFuel.getState().resetAll();
    } finally {
      set({ session: null, user: null, loading: false });
    }
  },
}));
