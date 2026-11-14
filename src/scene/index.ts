/**
 * Modul `src/scene`: Mengelola visualisasi 3D rumah kaca menggunakan Three.js.
 * PENTING: Tidak boleh ada perhitungan Aljabar Boolean di dalam modul ini;
 * scene hanya menerima status boolean (ON/OFF) dari state hasil evaluasi engine.
 */

import * as THREE from 'three';
import type { ActuatorValues } from '../state';

export class GreenhouseScene {
  private readonly container: HTMLElement;
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    this.camera.position.set(8, 6, 10);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Render frame awal sebagai verifikasi bahwa Three.js siap digunakan
    this.renderer.render(this.scene, this.camera);
  }

  /** Memperbarui animasi/visual mesin berdasarkan nilai aktuator tanpa mengevaluasi logika Boolean */
  public applyActuatorStates(_actuators: Readonly<ActuatorValues>): void {
    // Implementasi objek 3D rumah kaca dan animasi mesin akan dibangun pada Fase 3 & Fase 4
    this.renderer.render(this.scene, this.camera);
  }

  /** Membersihkan resource GPU saat komponen dilepas */
  public dispose(): void {
    this.renderer.dispose();
  }
}
