// lib/sync.ts
import { supabase } from "./supabase";
import { useFuel } from "../state/useFuel";
import type { FillUp, FuelType } from "../state/useFuel"; // usa o mesmo tipo do estado

// Tipo como está no banco (tabela fillups)
type RemoteFillup = {
  id: string;
  user_id: string;
  app_id: string;
  date: string;         // ISO
  fuel_type: string;    // será convertido p/ FuelType
  liters: number;
  price_per_l: number;
  tank_full: boolean;
  odo_km: number;
  created_at: string;
  updated_at: string;
};

function toRemoteRow(f: FillUp, userId: string) {
  return {
    user_id: userId,
    app_id: f.id,
    date: new Date(f.date).toISOString(),
    fuel_type: f.type,
    liters: f.liters,
    price_per_l: f.pricePerL,
    tank_full: f.tankFull,
    odo_km: f.odoKm,
  };
}

function toLocalFillup(r: RemoteFillup): FillUp {
  return {
    id: r.app_id,
    type: r.fuel_type as FuelType,   // converte string -> FuelType
    liters: Number(r.liters),
    pricePerL: Number(r.price_per_l),
    tankFull: r.tank_full,
    date: new Date(r.date).getTime(),
    odoKm: Number(r.odo_km),
  };
}

/** Baixa todos os abastecimentos do usuário e substitui na store. */
export async function syncDownAll(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("fillups")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true });

  if (error) throw error;

  const list: FillUp[] = ((data ?? []) as RemoteFillup[]).map(toLocalFillup);
  useFuel.getState().setFillups(list);
}

/** Sobe/atualiza um abastecimento (onConflict = app_id). */
export async function pushFillup(f: FillUp): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const row = toRemoteRow(f, user.id);
  const { error } = await supabase
    .from("fillups")
    .upsert(row, { onConflict: "app_id" });

  if (error) throw error;
}

/** Apaga um abastecimento remoto pelo app_id. */
export async function deleteRemote(appId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("fillups")
    .delete()
    .eq("app_id", appId);

  if (error) throw error;
}
