// JAROTCOMPILER — project scaffolds for pure Flutter & Native Android engines.
// Generated server-side whenever a project is created, so every project starts
// with a complete, buildable file tree (manifest, gradle, entry source, etc.)

export type Engine = "flutter" | "native"

export type ScaffoldFile = {
  path: string
  content: string
  encoding?: "utf8" | "base64"
}

export function normalizePackage(raw: string): string {
  let pkg = raw.trim().toLowerCase().replace(/[^a-z0-9._]/g, "")
  pkg = pkg.replace(/\.+/g, ".").replace(/^\.+|\.+$/g, "")
  if (!pkg) pkg = "com.jarot.app"
  return pkg
}

// segmen package tidak boleh kata kunci Java (mis. "native", "class", "int")
const JAVA_KEYWORDS = new Set([
  "abstract","assert","boolean","break","byte","case","catch","char","class","const","continue",
  "default","do","double","else","enum","extends","final","finally","float","for","goto","if",
  "implements","import","instanceof","int","interface","long","native","new","package","private",
  "protected","public","return","short","static","strictfp","super","switch","synchronized","this",
  "throw","throws","transient","try","void","volatile","while","true","false","null",
])

export function packageError(pkg: string): string | null {
  if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg)) {
    return "Format package salah, contoh: com.jarot.app"
  }
  const bad = pkg.split(".").find((s) => JAVA_KEYWORDS.has(s))
  if (bad) return `"${bad}" adalah kata kunci Java, ganti segmen package itu`
  return null
}

export function packageToPath(pkg: string): string {
  return pkg.split(".").filter(Boolean).join("/")
}

export function flutterScaffold(appName: string, pkg: string): ScaffoldFile[] {
  const safeName = appName.replace(/["'\\]/g, "")
  return [
    {
      path: "pubspec.yaml",
      content: `name: jarot_app
description: Aplikasi ${safeName} dibangun dengan JAROTCOMPILER
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.4.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.8

flutter:
  uses-material-design: true
`,
    },
    {
      path: "lib/main.dart",
      content: `import 'package:flutter/material.dart';

void main() => runApp(const JarotApp());

class JarotApp extends StatelessWidget {
  const JarotApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: '${safeName}',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFA6E22E),
          brightness: Brightness.dark,
        ),
      ),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        title: const Text('JAROTCOMPILER'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.terminal_rounded,
              size: 72,
              color: Color(0xFFA6E22E),
            ),
            const SizedBox(height: 20),
            Text(
              'Hello dari ${safeName}!',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              'Package: ${pkg}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}
`,
    },
    {
      path: "README.md",
      content: `# ${safeName}

Dibuat dengan JAROTCOMPILER — engine Flutter.

- Package: $pkg
- Edit file di explorer, lalu tekan BUILD APK.

Setelah build sukses, APK bisa diunduh langsung dari halaman build.
`,
    },
  ]
}

export function nativeScaffold(appName: string, pkg: string): ScaffoldFile[] {
  const safeName = appName.replace(/["'\\]/g, "")
  const pkgPath = packageToPath(pkg)
  return [
    {
      path: "settings.gradle",
      content: `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "JarotApp"
include ':app'
`,
    },
    {
      path: "build.gradle",
      content: `plugins {
    id 'com.android.application' version '8.5.2' apply false
}
`,
    },
    {
      path: "gradle.properties",
      content: `org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
`,
    },
    {
      path: "app/build.gradle",
      content: `plugins {
    id 'com.android.application'
}

android {
    namespace '${pkg}'
    compileSdk 34

    defaultConfig {
        applicationId '${pkg}'
        minSdk 21
        targetSdk 34
        versionCode 1
        versionName '1.0'
    }

    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.debug
        }
    }
}
`,
    },
    {
      path: "app/src/main/AndroidManifest.xml",
      content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:icon="@mipmap/ic_launcher"
        android:label="${safeName}"
        android:theme="@android:style/Theme.Material.NoActionBar"
        android:allowBackup="true">

        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`,
    },
    {
      path: `app/src/main/java/${pkgPath}/MainActivity.java`,
      content: `package ${pkg};

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.TextView;

public class MainActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        TextView label = new TextView(this);
        label.setText("Hello dari ${safeName}!");
        label.setTextSize(22f);
        label.setTextColor(Color.parseColor("#EDF2F7"));
        label.setGravity(Gravity.CENTER);

        setContentView(label);
    }
}
`,
    },
    {
      path: "README.md",
      content: `# ${safeName}

Dibuat dengan JAROTCOMPILER — engine Native (Java + Gradle).

- Package: $pkg
- Entry point: app/src/main/java/${pkgPath}/MainActivity.java

Tekan BUILD APK untuk compile, lalu unduh hasilnya.
`,
    },
  ]
}

export function scaffoldFor(engine: Engine, appName: string, pkg: string): ScaffoldFile[] {
  return engine === "flutter"
    ? flutterScaffold(appName, pkg)
    : nativeScaffold(appName, pkg)
}

// Folders to create (as explicit rows) so the tree shows the real structure
export function scaffoldFolders(engine: Engine, pkg: string): string[] {
  if (engine === "flutter") {
    return ["lib", "assets"]
  }
  const pkgPath = packageToPath(pkg)
  return ["app", "app/src", "app/src/main", "app/src/main/java", `app/src/main/java/${pkgPath}`]
}

// Starter content for newly created files, by extension
export function templateFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? ""
  switch (ext) {
    case "dart":
      return `import 'package:flutter/material.dart';

class ${pascal(basename(path))} extends StatelessWidget {
  const ${pascal(basename(path))}({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('${basename(path)}')),
      body: const Center(child: Text('Halaman baru')),
    );
  }
}
`
    case "java":
      return `package ${pkgGuess(path)};

public class ${pascal(basename(path))} {
}
`
    case "kt":
      return `package ${pkgGuess(path)}

class ${pascal(basename(path))} {
}
`
    case "xml":
      return `<?xml version="1.0" encoding="utf-8"?>
<resources>
</resources>
`
    case "gradle":
      return `// ${path}
`
    case "yaml":
    case "yml":
      return `# ${path}
`
    case "md":
      return `# ${basename(path)}
`
    case "json":
      return `{}
`
    case "properties":
      return `# ${path}
`
    case "css":
      return `/* ${path} */\n`
    case "js":
      return `// ${path}\n`
    default:
      return ""
  }
}

function basename(path: string): string {
  const name = path.split("/").pop() ?? "file"
  return name.replace(/\.[^.]+$/, "")
}

function pascal(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, " ")
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("") || "NewFile"
}

function pkgGuess(path: string): string {
  // guess java package from path like app/src/main/java/com/example/x/Foo.java
  const m = path.match(/java\/((?:[a-z0-9_]+\/)+)/)
  if (m) return m[1].replaceAll("/", ".").replace(/\.$/, "")
  return "com.jarot.app"
}
