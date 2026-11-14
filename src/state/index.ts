/**
 * Modul `src/state`: Penghubung antara engine logika (`src/logic`),
 * tampilan 3D (`src/scene`), dan antarmuka pengguna (`src/ui`).
 */

import type { ActuatorId, SensorVariable } from '../logic';

/** Nilai kebenaran (true/false) untuk keenam sensor saat ini */
export type SensorValues = Record<SensorVariable, boolean>;

/** Status nyala/mati (true/false) untuk keenam mesin aktuator */
export type ActuatorValues = Record<ActuatorId, boolean>;

/** State aplikasi awal dengan nilai default yang aman (P dan D tidak true bersamaan) */
export interface AppState {
  sensors: SensorValues;
  actuators: ActuatorValues;
}

/** Membuat state awal default ketika aplikasi pertama kali dimuat */
export function createInitialAppState(): AppState {
  return {
    sensors: {
      P: false,
      D: false,
      K: false,
      G: false,
      A: true,
      M: false,
    },
    actuators: {
      waterPump: false,
      fan: false,
      roofVent: false,
      heater: false,
      growLight: false,
      alarm: false,
    },
  };
}
