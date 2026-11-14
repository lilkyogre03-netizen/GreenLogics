# PROGRESS — GreenLogic: Simulasi Rumah Kaca 3D dengan Aljabar Boolean

Dokumen ini mencatat status pengerjaan setiap fase, keputusan desain arsitektur beserta alasannya, struktur file terkini, dan daftar pekerjaan untuk fase berikutnya. Agent atau pengembang selanjutnya dapat membaca `README.md` dan `PROGRESS.md` ini untuk memahami konteks proyek secara utuh.

---

## Status Fase

- [x] **Fase 1: Scaffold** (Vite + TypeScript Strict, ESLint, Prettier, Vitest, struktur folder 4-lapisan, README awal)
- [ ] **Fase 2: Engine Logika + Unit Test Lengkap** (Tokenizer, Parser AST, Evaluator, Tabel Kebenaran dengan _don't-care_, Quine-McCluskey, Cek Ekuivalensi, Langkah Hukum Boolean, Konversi AST ke Gate Graph)
- [ ] **Fase 3: Scene 3D Statis** (Rumah kaca prosedural, bedeng, tanaman, 6 mesin aktuator, pencahayaan, `OrbitControls`, label)
- [ ] **Fase 4: Integrasi State Sensor -> Boolean Engine -> Animasi Mesin + Panel Sensor**
- [ ] **Fase 5: Editor Ekspresi, Tabel Kebenaran Interaktif, Penyederhanaan + Langkah Hukum Boolean**
- [ ] **Fase 6: Peta Karnaugh (K-Map) Interaktif & Diagram Gerbang Logika (SVG)**
- [ ] **Fase 7: Pertumbuhan Tanaman, Siklus Siang/Malam, Polish UI & Optimasi Performa**
- [ ] **Fase 8: Dokumentasi `README.md` Final & Laporan Akhir**

---

## Keputusan Desain Penting (Fase 1)

1. **Pemisahan Ketat 4 Direktori (`src/logic`, `src/state`, `src/scene`, `src/ui`):**
   - `src/logic` dirancang murni TypeScript tanpa ketergantungan pada objek `window`, `document` (DOM), ataupun `three`. Alasannya agar seluruh algoritma Matematika Diskrit dapat diuji di lingkungan Node (`environment: 'node'` pada Vitest) dengan cepat dan deterministik.
   - `src/scene` hanya menerima status boolean (`ActuatorValues`) dari `src/state`, sehingga tidak ada perhitungan logika Boolean yang bocor ke dalam kode grafika 3D.
2. **Konfigurasi TypeScript Ekstra Ketat (`tsconfig.json`):**
   - Selain `"strict": true`, diaktifkan juga `"noUncheckedIndexedAccess": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, dan `"noImplicitOverride": true`. Hal ini sangat membantu mencegah _bug_ akses indeks _array/table_ saat nanti mengimplementasikan algoritma Quine-McCluskey dan K-Map di Fase 2 & 6.
3. **ESLint 9 Flat Config + Prettier (`eslint.config.js`):**
   - Aturan `@typescript-eslint/no-explicit-any` disetel ke `'error'` dan `@typescript-eslint/ban-ts-comment` mewajibkan penjelasan minimal 10 karakter jika terpaksa dipakai, sesuai standar kualitas proyek.
4. **Representasi Constraint Fisik (`P` dan `D`):**
   - Sejak Fase 1, kontrak tipe `SensorVariable` (`P | D | K | G | A | M`) dan fungsi `isDontCareCondition` sudah didefinisikan di `src/logic/index.ts` untuk memastikan keseragaman penanganan _don't-care_ ketika suhu panas (`P`) dan suhu dingin (`D`) bernilai `true` bersamaan.

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
│   │   └── index.ts
│   ├── scene/
│   │   └── index.ts
│   ├── state/
│   │   └── index.ts
│   └── ui/
│       └── index.ts
└── tests/
    └── smoke.test.ts
```

---

## Apa yang Belum Dikerjakan (Target Fase 2)

Pada **Fase 2**, kita akan membangun keseluruhan _engine_ Aljabar Boolean di `src/logic/` beserta _unit test_ lengkap di `tests/`:

1. **Tokenizer & Recursive Descent Parser** (`src/logic/parser.ts` / `lexer.ts`):
   - Mendukung operator `NOT` (`¬`, `!`, `~`), `AND` (`∧`, `&`, `&&`), `XOR` (`⊕`, `^`, `XOR`), `OR` (`∨`, `|`, `||`), tanda kurung `( )`, variabel `A-Z`, serta konstanta `0` dan `1`.
   - Urutan presedensi baku: `()` > `NOT` > `AND` > `XOR` > `OR`.
   - Pesan _error_ sintaks yang informatif dalam bahasa Indonesia (menyertakan posisi karakter/token yang salah).
2. **Evaluator & Generator Tabel Kebenaran** (`src/logic/truthTable.ts`):
   - Mengevaluasi AST terhadap _assignment_ variabel.
   - Menghasilkan tabel kebenaran hingga 6 variabel, termasuk penandaan baris _don't-care_ (`P ∧ D`).
3. **Penyederhanaan Quine-McCluskey** (`src/logic/quineMcCluskey.ts`):
   - Mencari _prime implicants_ dan _essential prime implicants_ (mendukung _don't-care_ minterms) untuk menghasilkan ekspresi SOP (_Sum of Products_) minimal.
4. **Pendeteksi Langkah Hukum Aljabar Boolean** (`src/logic/booleanLaws.ts`):
   - Melacak dan menjelaskan langkah-langkah penyederhanaan menggunakan hukum Identitas, Dominasi, Idempoten, Komplemen, Absorpsi, De Morgan, dan Distributif.
5. **Pemeriksa Ekuivalensi & Konversi Gate Graph** (`src/logic/equivalence.ts`, `src/logic/gateGraph.ts`):
   - Membandingkan ekuivalensi dua ekspresi lewat tabel kebenaran (dengan opsi mengabaikan baris _don't-care_).
   - Mengonversi AST menjadi struktur graf gerbang logika (_nodes_ & _wires_) siap gambar.
