// state/useFuel.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FuelType = "gasolina" | "etanol" | "diesel";

export type FillUp = {
  id: string;
  date: number;        // epoch ms
  liters: number;
  pricePerL: number;
  type: FuelType;
  tankFull: boolean;
  odoKm: number;       // hodômetro do app na hora do abastecimento
};

type FuelState = {
  // veículo
  tankL: number;

  // “hodômetro” do app (soma de todos os km percorridos)
  odoKm: number;

  // combustível estimado no tanque agora
  fuelLeftL: number;

  // consumo médio (km/L)
  avgKmPerL: number;

  // quantas amostras já usamos para o avg (método tanque-cheio)
  samples: number;

  // histórico de abastecimentos
  fillups: FillUp[];

  // preferências/estado de alerta de autonomia
  lowRangeKm: number;
  lastLowRangeNotified: number | null;

  // ações
  setTankL: (litros: number) => void;
  setAvg: (kmPerL: number) => void;
  addDistance: (km: number) => void;

  registerFillUp: (payload: {
    liters: number;
    pricePerL: number;
    type: FuelType;
    tankFull: boolean;
  }) => void;

  deleteFillUp: (id: string) => void;
  setFillups: (list: FillUp[]) => void;

  setLowRangeKm: (n: number) => void;
  markLowRangeNotified: () => void;
  resetNotificationFlag: () => void;

  resetAll: () => void;
};

export const useFuel = create<FuelState>()(
  persist(
    (set, get) => {
      // Helper: recalcula média/samples e combustível atual a partir de uma lista
      const recalcFromList = (list: FillUp[]) => {
        const s = get();

        const fulls = list
          .filter((f: FillUp) => f.tankFull)
          .sort((a: FillUp, b: FillUp) => a.date - b.date);

        let sum = 0;
        let samples = 0;
        for (let i = 1; i < fulls.length; i++) {
          const prev = fulls[i - 1];
          const cur = fulls[i];
          const dist = cur.odoKm - prev.odoKm;
          if (dist > 1 && cur.liters > 0) {
            sum += dist / cur.liters;
            samples++;
          }
        }

        const avgKmPerL = samples > 0 ? sum / samples : s.avgKmPerL;

        // estima combustível atual: parte do último "cheio" e desconta o que rodou desde então
        let fuelLeftL = s.fuelLeftL;
        if (fulls.length > 0) {
          const lastFull = fulls[fulls.length - 1];
          const distSince = Math.max(0, s.odoKm - lastFull.odoKm);
          const avg = Math.max(1, avgKmPerL);
          fuelLeftL = Math.max(0, Math.min(s.tankL, s.tankL - distSince / avg));
        }

        return { avgKmPerL, samples, fuelLeftL };
      };

      return {
        tankL: 50,
        odoKm: 0,
        fuelLeftL: 50,
        avgKmPerL: 11,
        samples: 0,
        fillups: [],

        // alertas
        lowRangeKm: 80,
        lastLowRangeNotified: null,

        setTankL: (litros) => {
          const clamped = Math.max(10, Math.min(120, litros));
          set((s) => ({
            tankL: clamped,
            fuelLeftL: Math.min(s.fuelLeftL, clamped),
          }));
        },

        setAvg: (kmPerL) => set({ avgKmPerL: Math.max(4, Math.min(30, kmPerL)) }),

        addDistance: (km) => {
          if (!isFinite(km) || km <= 0) return;
          set((s) => {
            const used = km / Math.max(1, s.avgKmPerL);
            return {
              odoKm: s.odoKm + km,
              fuelLeftL: Math.max(0, s.fuelLeftL - used),
            };
          });
        },

        registerFillUp: ({ liters, pricePerL, type, tankFull }) => {
          const s = get();
          const now = Date.now();
          const newFill: FillUp = {
            id: String(now),
            date: now,
            liters: Math.max(0, liters),
            pricePerL: Math.max(0, pricePerL),
            type,
            tankFull,
            odoKm: s.odoKm,
          };

          // Atualiza combustível estimado
          let newFuelLeft = s.fuelLeftL + liters;
          if (tankFull) newFuelLeft = s.tankL;
          newFuelLeft = Math.min(newFuelLeft, s.tankL);

          // Se "tanque cheio" e houver um "cheio" anterior, calculamos nova amostra
          let newAvg = s.avgKmPerL;
          let newSamples = s.samples;
          if (tankFull) {
            const prevFull = [...s.fillups].reverse().find((f) => f.tankFull);
            if (prevFull) {
              const dist = s.odoKm - prevFull.odoKm;
              if (dist > 1 && liters > 0) {
                const sample = dist / liters; // km/L nesta janela
                newAvg = (s.avgKmPerL * s.samples + sample) / (s.samples + 1);
                newSamples = s.samples + 1;
              }
            }
          }

          set({
            fillups: [...s.fillups, newFill],
            fuelLeftL: newFuelLeft,
            avgKmPerL: newAvg,
            samples: newSamples,
            lastLowRangeNotified: null, // permite alertar de novo após abastecer
          });
        },

        deleteFillUp: (id) => {
          const s = get();
          const list = s.fillups.filter((f) => f.id !== id);
          const rec = recalcFromList(list);
          set({ fillups: list, ...rec });
        },

        setFillups: (list: FillUp[]) => {
          const rec = recalcFromList(list);
          set({ fillups: list, ...rec });
        },

        setLowRangeKm: (n) =>
          set({ lowRangeKm: Math.max(10, Math.min(300, Number(n) || 0)) }),

        markLowRangeNotified: () => set({ lastLowRangeNotified: Date.now() }),
        resetNotificationFlag: () => set({ lastLowRangeNotified: null }),

        resetAll: () =>
          set({
            odoKm: 0,
            fuelLeftL: 50,
            avgKmPerL: 11,
            samples: 0,
            fillups: [],
            lastLowRangeNotified: null,
          }),
      };
    },
    {
      name: "abastece-ai-store",
      storage: createJSONStorage(() => AsyncStorage),
      // version: 1,
    }
  )
);
