# GreenLogic: Simulasi Rumah Kaca 3D dengan Aljabar Boolean

**GreenLogic** adalah aplikasi web interaktif untuk memvisualisasikan penerapan **Aljabar Boolean** (materi Matematika Diskrit) pada sistem kendali otomatis rumah kaca (_greenhouse_) 3D. Pengguna dapat mengamati secara langsung hubungan antara:

1. **Ekspresi Aljabar Boolean** dan penyederhanaannya (hukum-hukum Boolean & algoritma Quine-McCluskey),
2. **Tabel Kebenaran** (_Truth Table_) dengan kondisi _don't-care_,
3. **Peta Karnaugh** (_K-Map_) 2–4 variabel,
4. **Rangkaian Gerbang Logika** (_Logic Gate Diagram_ SVG), serta
5. **Perilaku Mesin 3D** (pompa air, kipas, ventilasi atap, pemanas, lampu _grow_, dan alarm) di dalam rumah kaca.

---

## Tech Stack

- **Bundler & Dev Server:** Vite
- **Bahasa Pemrograman:** TypeScript (`strict: true`, tanpa `any`)
- **Grafika 3D:** Three.js (`three` + `OrbitControls`), seluruh geometri dibuat secara prosedural tanpa aset eksternal
- **Antarmuka Pengguna (UI):** DOM & CSS murni berbahasa Indonesia (tanpa _framework_ UI)
- **Pengujian & Kualitas Kode:** Vitest, ESLint (Flat Config), Prettier

---

## Arsitektur Direktori

Arsitektur dipisahkan secara tegas menjadi 4 lapisan utama agar _engine_ logika dapat diuji secara murni tanpa ketergantungan pada _browser_ (DOM) maupun WebGL (Three.js):

```text
d:\GreenLogic
├── src/
│   ├── logic/      # Engine Aljabar Boolean murni TypeScript (TANPA import three/DOM)
│   ├── state/      # State sensor & aktuator, penghubung logic -> scene -> ui
│   ├── scene/      # Visualisasi 3D Three.js (hanya menerima boolean state output)
│   ├── ui/         # Komponen UI DOM, tabel kebenaran, K-map, diagram gerbang
│   ├── style.css   # Styling responsif aplikasi
│   └── main.ts     # Entry point aplikasi
├── tests/          # Unit test Vitest untuk menguji src/logic
├── index.html      # Halaman utama aplikasi
├── PROGRESS.md     # Catatan progres pembangunan per fase & keputusan desain
└── README.md       # Dokumentasi proyek
```

---

## Model Boolean Default

### Variabel Input (Sensor)

- `P` = Suhu panas (_true_ jika suhu melewati ambang batas panas)
- `D` = Suhu dingin (_true_ jika suhu di bawah ambang batas dingin)
- `K` = Tanah kering (_true_ jika kelembapan tanah rendah)
- `G` = Cahaya kurang (_true_ jika intensitas cahaya rendah)
- `A` = Air tersedia di tangki (_true_ jika tangki memiliki air)
- `M` = Malam hari (_true_ jika waktu simulasi berada pada malam hari)

> **Constraint Fisik (_Don't-Care Condition_):** Sensor `P` (suhu panas) dan `D` (suhu dingin) tidak mungkin bernilai `true` secara bersamaan (`P ∧ D = 0`). Kombinasi input dengan `P = 1` dan `D = 1` diperlakukan sebagai kondisi _don't-care_ (`X`) pada tabel kebenaran dan penyederhanaan ekspresi.

### Variabel Output (Aktuator / Mesin)

| Aktuator            | Ekspresi Awal (Belum Sederhana) | Bentuk Sederhana (SOP Minimal)    |
| :------------------ | :------------------------------ | :-------------------------------- |
| **Pompa Air**       | `(K ∧ A) ∨ (K ∧ A ∧ ¬P)`        | `K ∧ A`                           |
| **Kipas Pendingin** | `P`                             | `P`                               |
| **Ventilasi Atap**  | `(P ∧ ¬D) ∨ (P ∧ M)`            | `P` _(dengan don't-care `P ∧ D`)_ |
| **Pemanas**         | `D ∧ M`                         | `D ∧ M`                           |
| **Lampu Grow**      | `G ∧ ¬M`                        | `G ∧ ¬M`                          |
| **Alarm Tangki**    | `¬A ∧ K`                        | `¬A ∧ K`                          |

---

## Cara Menjalankan Proyek

```bash
# 1. Instal dependensi
npm install

# 2. Jalankan server pengembangan (Vite)
npm run dev

# 3. Jalankan pemeriksaan tipe TypeScript
npm run typecheck

# 4. Jalankan linter (ESLint) & pengecekan format (Prettier)
npm run lint
npm run format:check

# 5. Jalankan unit test (Vitest)
npm test

# 6. Build untuk produksi
npm run build
```
