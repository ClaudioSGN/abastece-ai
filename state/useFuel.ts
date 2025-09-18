// state/useFuel.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type FuelType = "gasolina" | "etanol" | "diesel";

export type FillUp = {
  id: string;
  date: number;
  liters: number;
  pricePerL: number;
  type: FuelType;
  tankFull: boolean;
  odoKm: number; // hodômetro do app na hora do abastecimento
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

  // quantas amostras já usamos para o avg
  samples: number;

  // histórico de abastecimentos
  fillups: FillUp[];

  // ações
  setTankL: (litros: number) => void;
  setAvg: (kmPerL: number) => void;
  addDistance: (km: number) => void;
  registerFillUp: (payload: { liters: number; pricePerL: number; type: FuelType; tankFull: boolean }) => void;
  resetAll: () => void;
};

export const useFuel = create<FuelState>()(
  persist(
    (set, get) => ({
      tankL: 50,           // capacidade padrão (o usuário pode ajustar depois)
      odoKm: 0,
      fuelLeftL: 50,       // começa “cheio” por conveniência
      avgKmPerL: 11,       // chute inicial até ter dados reais
      samples: 0,
      fillups: [],

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

        // Se este abastecimento é "tanque cheio", e existir um abastecimento anterior "tanque cheio",
        // podemos calcular uma amostra real de consumo (km/L) pelo método "tanque-cheio".
        let newAvg = s.avgKmPerL;
        let newSamples = s.samples;
        if (tankFull) {
          const prevFull = [...s.fillups].reverse().find((f) => f.tankFull);
          if (prevFull) {
            const dist = s.odoKm - prevFull.odoKm; // km rodados desde o último "cheio"
            if (dist > 1 && liters > 0) {
              const sample = dist / liters; // km/L nesta janela
              // média incremental
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
        });
      },

      resetAll: () =>
        set({
          odoKm: 0,
          fuelLeftL: 50,
          avgKmPerL: 11,
          samples: 0,
          fillups: [],
        }),
    }),
    {
      name: "abastece-ai-store",
      storage: createJSONStorage(() => AsyncStorage),
      // se quiser migrar dados no futuro, use "version"
    }
  )
);