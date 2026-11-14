import './style.css';
import { createInitialAppState } from './state';
import { GreenhouseScene } from './scene';
import { mountAppLayout } from './ui';

// Titik masuk utama aplikasi yang merakit lapisan state, UI, dan scene 3D
function bootstrap(): void {
  const appRoot = document.querySelector<HTMLElement>('#app');
  if (!appRoot) {
    throw new Error('Elemen #app tidak ditemukan pada dokumen HTML.');
  }

  const state = createInitialAppState();
  const { sceneContainer } = mountAppLayout(appRoot, state);
  const scene = new GreenhouseScene(sceneContainer);

  scene.applyActuatorStates(state.actuators);
}

bootstrap();
