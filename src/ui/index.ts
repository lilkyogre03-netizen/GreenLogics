/**
 * Modul `src/ui`: Membangun antarmuka DOM berbahasa Indonesia
 * untuk panel sensor, editor ekspresi Boolean, tabel kebenaran, K-map, dan gerbang logika.
 */

import { DEFAULT_ACTUATOR_DEFINITIONS, SENSOR_DEFINITIONS } from '../logic';
import type { AppState } from '../state';

export interface UILayoutRefs {
  sceneContainer: HTMLElement;
  panelContainer: HTMLElement;
}

/** Merender kerangka layout utama aplikasi (viewport 3D di kiri, panel kontrol di kanan) */
export function mountAppLayout(
  root: HTMLElement,
  initialState: Readonly<AppState>,
): UILayoutRefs {
  root.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'app-layout';

  const sceneContainer = document.createElement('main');
  sceneContainer.className = 'scene-container';

  const badge = document.createElement('div');
  badge.className = 'scene-placeholder-badge';
  badge.textContent =
    'Kanvas 3D Three.js Aktif — Model Rumah Kaca dibangun pada Fase 3';
  sceneContainer.appendChild(badge);

  const panelContainer = document.createElement('aside');
  panelContainer.className = 'ui-panel';

  const header = document.createElement('header');
  header.className = 'ui-header';
  header.innerHTML = `
    <h1>GreenLogic 3D</h1>
    <p>Simulasi Rumah Kaca Otomatis berbasis Aljabar Boolean</p>
  `;

  const sensorCard = document.createElement('section');
  sensorCard.className = 'card';
  sensorCard.innerHTML = `
    <h2>Variabel Sensor Input</h2>
    <ul class="expression-list">
      ${SENSOR_DEFINITIONS.map(
        (s) =>
          `<li><code>${s.variable}</code> = ${s.label} (${
            initialState.sensors[s.variable] ? 'TRUE' : 'FALSE'
          })</li>`,
      ).join('')}
    </ul>
  `;

  const actuatorCard = document.createElement('section');
  actuatorCard.className = 'card';
  actuatorCard.innerHTML = `
    <h2>Ekspresi Boolean Aktuator Default</h2>
    <ul class="expression-list">
      ${DEFAULT_ACTUATOR_DEFINITIONS.map(
        (a) =>
          `<li><strong>${a.label}:</strong> <code>${a.defaultExpression}</code></li>`,
      ).join('')}
    </ul>
  `;

  panelContainer.append(header, sensorCard, actuatorCard);
  layout.append(sceneContainer, panelContainer);
  root.appendChild(layout);

  return { sceneContainer, panelContainer };
}
