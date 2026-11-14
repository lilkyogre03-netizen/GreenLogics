# PROGRESS — GreenLogic: Simulasi Rumah Kaca 3D dengan Aljabar Boolean

Dokumen ini mencatat status pengerjaan setiap fase, keputusan desain arsitektur beserta alasannya, struktur file terkini, dan daftar pekerjaan untuk fase berikutnya. Agent atau pengembang selanjutnya dapat membaca `README.md` dan `PROGRESS.md` ini untuk memahami konteks proyek secara utuh.

---

## Status Fase

- [x] **Fase 1: Scaffold** (Vite + TypeScript Strict, ESLint, Prettier, Vitest, struktur folder 4-lapisan, README awal)
- [x] **Fase 2: Engine Logika + Unit Test Lengkap** (Tokenizer, Parser AST, Evaluator, Tabel Kebenaran dengan _don't-care_, Quine-McCluskey, Cek Ekuivalensi, Langkah Hukum Boolean, Konversi AST ke Gate Graph)
- [ ] **Fase 3: Scene 3D Statis** (Rumah kaca prosedural, bedeng, tanaman, 6 mesin aktuator, pencahayaan, `OrbitControls`, label)
- [ ] **Fase 4: Integrasi State Sensor -> Boolean Engine -> Animasi Mesin + Panel Sensor**
- [ ] **Fase 5: Editor Ekspresi, Tabel Kebenaran Interaktif, Penyederhanaan + Langkah Hukum Boolean**
- [ ] **Fase 6: Peta Karnaugh (K-Map) Interaktif & Diagram Gerbang Logika (SVG)**
- [ ] **Fase 7: Pertumbuhan Tanaman, Siklus Siang/Malam, Polish UI & Optimasi Performa**
- [ ] **Fase 8: Dokumentasi `README.md` Final & Laporan Akhir**

---

## Keputusan Desain Penting

### Fase 1: Arsitektur & Standar Kualitas

1. **Pemisahan Ketat 4 Direktori (`src/logic`, `src/state`, `src/scene`, `src/ui`):**
   - `src/logic` dirancang murni TypeScript tanpa ketergantungan pada objek `window`, `document` (DOM), ataupun `three`. Alasannya agar seluruh algoritma Matematika Diskrit dapat diuji di lingkungan Node (`environment: 'node'` pada Vitest) dengan cepat dan deterministik.
   - `src/scene` hanya menerima status boolean (`ActuatorValues`) dari `src/state`, sehingga tidak ada perhitungan logika Boolean yang bocor ke dalam kode grafika 3D.
2. **Konfigurasi TypeScript Ekstra Ketat (`tsconfig.json`):**
   - Selain `"strict": true`, diaktifkan juga `"noUncheckedIndexedAccess": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, dan `"noImplicitOverride": true`.
3. **ESLint 9 Flat Config + Prettier (`eslint.config.js`):**
   - Aturan `@typescript-eslint/no-explicit-any` disetel ke `'error'` dan `@typescript-eslint/ban-ts-comment` mewajibkan penjelasan minimal 10 karakter.

### Fase 2: Engine Aljabar Boolean (`src/logic`)

1. **Recursive Descent Parser & AST Discriminated Union (`src/logic/parser.ts`, `src/logic/types.ts`):**
   - Menggunakan _Recursive Descent Parser_ dengan 5 level fungsi (`parseOr` $\rightarrow$ `parseXor` $\rightarrow$ `parseAnd` $\rightarrow$ `parseNot` $\rightarrow$ `parsePrimary`) untuk menjamin urutan presedensi operator `()` > `NOT` > `AND` > `XOR` > `OR` tanpa ambiguitas.
   - Mendukung notasi matematika (`¬`, `∧`, `∨`, `⊕`) sekaligus notasi alternatif (`!`, `~`, `&`, `&&`, `*`, `|`, `||`, `+`, `^`, `NOT`, `AND`, `OR`, `XOR`) agar pengguna mudah mengetik ekspresi di keyboard biasa.
   - Kesalahan sintaks dilempar menggunakan `BooleanParseError` yang menyimpan indeks karakter (`position`) dan pesan diagnostik berbahasa Indonesia.
2. **Urutan Variabel & Penanganan _Don't-Care_ (`src/logic/truthTable.ts`, `src/logic/quineMcCluskey.ts`):**
   - Variabel diekstrak sesuai urutan kemunculannya pada ekspresi sehingga hasil penyederhanaan mempertahankan urutan yang akrab bagi pengguna (misal `(K ∧ A) ∨ (K ∧ A ∧ ¬P)` menghasilkan `K ∧ A`).
   - Kombinasi `P = true` dan `D = true` otomatis ditandai sebagai _don't-care_ (`outputSymbol: 'X'`) pada tabel kebenaran dan diikutsertakan dalam tahap pembentukan _Prime Implicant_ Quine-McCluskey, tetapi tidak wajib dicakup pada tahap _Prime Implicant Chart_. Hal ini memungkinkan ekspresi Ventilasi Atap `(P ∧ ¬D) ∨ (P ∧ M)` tereduksi menjadi `P`.
   - Pemilihan _minimal cover_ pada Quine-McCluskey menggunakan _Essential Prime Implicants_ dilanjutkan dengan pencarian _Branch-and-Bound_ eksak yang meminimalkan jumlah suku konjungsi dan jumlah literal.
3. **Rule-Based Algebraic Simplifier (`src/logic/booleanLaws.ts`):**
   - Untuk menampilkan langkah-langkah hukum Aljabar Boolean secara berurutan bagi mahasiswa, dibangun _AST Rewriter_ berbasis aturan yang mendeteksi Hukum Negasi Ganda, De Morgan, Dominasi, Identitas, Komplemen, Idempoten, Absorpsi (termasuk absorpsi multi-faktor dan absorpsi komplemen), Distributif (pemfaktoran), dan kondisi _don't-care_ fisik (`P ∧ D = 0`).
4. **Deduplikasi Terminal Input pada Gate Graph (`src/logic/gateGraph.ts`):**
   - Saat mengonversi AST menjadi `GateGraph`, variabel input yang sama digabungkan pada satu terminal `INPUT` di kolom paling kiri (`depth = 0`) dan dihubungkan dengan banyak kabel (`GateWire`) ke gerbang-gerbang berikutnya, menyerupai skema rangkaian digital standar.

---

## Struktur File Saat Ini

```text
d:\GreenLogic
├── .gitignore
├── .prettierignore
├── .prettierrc
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── PROGRESS.md
├── README.md
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── main.ts
│   ├── style.css
│   ├── logic/
│   │   ├── booleanLaws.ts
│   │   ├── equivalence.ts
│   │   ├── evaluator.ts
│   │   ├── gateGraph.ts
│   │   ├── index.ts
│   │   ├── parser.ts
│   │   ├── quineMcCluskey.ts
│   │   ├── truthTable.ts
│   │   └── types.ts
│   ├── scene/
│   │   └── index.ts
│   ├── state/
│   │   └── index.ts
│   └── ui/
│       └── index.ts
└── tests/
    ├── evaluatorAndTruthTable.test.ts
    ├── parser.test.ts
    ├── simplificationAndLaws.test.ts
    └── smoke.test.ts
```

---

## Apa yang Belum Dikerjakan (Target Fase 3)

Pada **Fase 3**, kita akan membangun **Scene 3D Statis (`src/scene/`)** menggunakan Three.js:

1. **Struktur Rumah Kaca (`src/scene/greenhouseBuilder.ts`):**
   - Lantai dasar dan fondasi rumah kaca.
   - Rangka logam rumah kaca, dinding dan atap kaca transparan menggunakan `THREE.MeshPhysicalMaterial` (transmission/opacity kaca) serta panel ventilasi atap yang memiliki _pivot group_ agar siap dianimasikan membuka/menutup.
2. **Bedeng Tanaman & Tanaman Prosedural (`src/scene/plantsBuilder.ts`):**
   - Minimal 2 bedeng tanaman berisi tanah (material yang warnanya siap diubah antara kering cokelat muda vs basah gelap).
   - Tanaman prosedural (batang silinder + daun geometri tiga dimensi) yang dikelompokkan agar skalanya (_scale_) dan warnanya dapat diatur.
3. **Keenam Mesin Aktuator 3D (`src/scene/machinesBuilder.ts`):**
   - **Tangki Air + Pompa Air:** Silinder tangki transparan dengan permukaan air di dalamnya + pipa distribusi ke bedeng.
   - **Kipas Pendingin:** Rumah kipas di dinding + baling-baling (_blades group_) yang siap berputar.
   - **Ventilasi Atap:** Jendela atap berengsel.
   - **Pemanas (_Heater_):** Unit pemanas dengan elemen _mesh_ yang siap memancarkan _glow_ oranye.
   - **Lampu Grow (_Grow Light_):** Unit lampu gantung di atas bedeng dengan `THREE.PointLight` + material _emissive_.
   - **Alarm Tangki:** Lampu sirine merah di dekat tangki air.
4. **Kamera, Pencahayaan, `OrbitControls`, Resize Handler, & Label Mesin (`src/scene/index.ts`):**
   - Integrasi `OrbitControls` dari `three/examples/jsm/controls/OrbitControls.js` dengan batas sudut vertikal (`maxPolarAngle`) dan jarak _zoom_.
   - Label HTML/3D kecil di setiap mesin agar pengguna mudah mengenali posisi ke-6 aktuator di dalam rumah kaca.
