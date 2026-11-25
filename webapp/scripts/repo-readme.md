# kepin-compiler — JAROTCOMPILER build engine

Repo **kepin-compiler** adalah rumah dari **JAROTCOMPILER** — compiler APK
mobile-first. Dua bagian hidup berdampingan di repo ini:

```
kepin-compiler/
├── webapp/                  ← source lengkap aplikasi web JAROTCOMPILER (Next.js 16)
├── .github/workflows/build.yml  ← workflow GitHub Actions yang compile APK
├── jarot.config.json         ← konfigurasi project yang sedang di-build
├── jarot-icon.png            ← icon launcher APK
└── app/, lib/, pubspec.yaml  ← file project hasil push dari editor (workspace build)
```

## Cara kerja

1. User bikin project di web JAROTCOMPILER (`webapp/`) — pilih engine,
   nama APK, package, dan icon.
2. Project di-edit di browser: file explorer, editor kode, import ZIP base.
3. Saat tombol **BUILD APK** ditekan, `webapp` mem-push seluruh isi project
   ke root repo ini sebagai satu commit (via git data API).
4. Push itu otomatis mem-trigger workflow `.github/workflows/build.yml`,
   yang membaca `jarot.config.json` lalu menjalankan toolchain **resmi**:

| Engine | Toolchain resmi | Hasil |
| --- | --- | --- |
| Native | Java 17 (Temurin) + Gradle 8.9 + AGP 8.5.2, `gradle assembleRelease` | `app-release.apk` |
| Flutter | Flutter 3.24.3 stable (subosito/flutter-action), `flutter pub get` + `flutter build apk --release` | `app-release.apk` |

5. APK di-upload sebagai artifact `jarot-apk`, lalu web JAROTCOMPILER
   mem-poll status run dan men-proxy unduhan APK ke user.

> Root repo juga berfungsi sebagai **workspace build** — file project yang
> sedang dikerjakan akan menimpa isi root pada setiap build, sementara
> `webapp/` (source platform) selalu di-preserve.

## Menjalankan webapp secara lokal

```bash
cd webapp
bun install
cp .env.example .env        # isi GITHUB_TOKEN (classic PAT) milikmu
bun run db:push             # siapkan database SQLite
bun run dev                 # buka http://localhost:3000
```

Variabel lingkungan yang dibutuhkan (lihat `webapp/.env.example`):

- `DATABASE_URL` — SQLite Prisma, misal `file:./db/custom.db`
- `GITHUB_TOKEN` — personal access token dengan scope `repo` + `workflow`
- `GITHUB_OWNER` / `GITHUB_REPO` — repo build engine (default repo ini)

## Struktur webapp

- `src/app/page.tsx` — router view client-side (Projects / Config / Editor)
- `src/app/api/**` — REST API: project CRUD, file CRUD, import ZIP, build, unduh APK
- `src/components/jarot/**` — Projects view, Config view, Editor view, File tree, Build sheet
- `src/lib/jarot/**` — scaffolder (auto-generate AndroidManifest dsb.), GitHub client, workflow
- `prisma/schema.prisma` — model Project, ProjectFile, Build (SQLite)

Workdir build: `ubuntu-latest` GitHub-hosted runner — tidak butuh self-hosted.
