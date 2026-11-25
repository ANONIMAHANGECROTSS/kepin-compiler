# kepin-compiler

Repo **build engine** untuk [JAROTCOMPILER](https://z.ai) — compiler APK mobile-first.

Setiap kali JAROTCOMPILER menekan tombol **BUILD APK**, isi project di-push ke repo ini,
dan GitHub Actions akan mem-build APK-nya dengan toolchain **resmi**:

| Engine | Toolchain | Hasil |
| --- | --- | --- |
| Native | Gradle 8.9 + AGP 8.5.2 + Java 17 (`assembleRelease`) | `app-release.apk` |
| Flutter | Flutter 3.24.3 resmi (`pub get` + `build apk --release`) | `app-release.apk` |

## Cara kerja

1. `jarot.config.json` — konfigurasi project (engine, nama APK, package).
2. `jarot-icon.png` — icon launcher yang dipasang ke APK.
3. Workflow `.github/workflows/build.yml` membaca config, lalu jalan sesuai engine.
4. APK di-upload sebagai artifact `jarot-apk`, diunduh otomatis oleh JAROTCOMPILER.

> Repo ini adalah workspace build — isinya akan tertimpa setiap kali ada build baru.
