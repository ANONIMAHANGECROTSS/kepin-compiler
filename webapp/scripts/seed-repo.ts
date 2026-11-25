// Seed repo kepin-compiler: create repo + push FULL source JAROTCOMPILER:
//   webapp/**            (source Next.js lengkap — tanpa node_modules/.next/.env/db)
//   README.md            (dokumentasi platform + build engine)
//   .gitignore, webapp/.env.example
//   .github/workflows/build.yml, jarot-icon.png, jarot.config.json
// Run: bun scripts/seed-repo.ts
import { repoExists, createRepo, pushFiles, repoSlug, type GhRepoFile } from "@/lib/jarot/github"
import { WORKFLOW_YML } from "@/lib/jarot/workflow"
import { DEFAULT_ICON_BASE64 } from "@/lib/jarot/icon"
import { scaffoldFor } from "@/lib/jarot/scaffolds"
import { readFileSync, readdirSync, statSync, writeFileSync } from "fs"
import { join, relative } from "path"

const ROOT = "/home/z/my-project"

// folder/file yang boleh masuk webapp/ di repo
const INCLUDE_DIRS = ["src", "prisma", "public", "scripts"]
const INCLUDE_FILES = [
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
  "tailwind.config.ts",
  "components.json",
  "eslint.config.mjs",
  "bun.lock",
  "DESIGN.md",
  "next-env.d.ts",
]

function collectFiles(dir: string, base: string, out: GhRepoFile[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "__pycache__") continue
    const full = join(dir, name)
    const st = statSync(full)
    if (st.isDirectory()) {
      collectFiles(full, base, out)
    } else if (st.isFile()) {
      const rel = relative(base, full).split("\\").join("/")
      const buf = readFileSync(full)
      if (buf.length > 3_500_000) {
        console.log("  skip (besar):", rel, buf.length)
        continue
      }
      // utf-8 aman? kalau ada NUL / banyak replacement, kirim base64
      const text = buf.toString("utf8")
      const hasBinary = text.includes("\0") || (text.match(/\uFFFD/g)?.length ?? 0) > 8
      out.push({
        path: `webapp/${rel}`,
        content: hasBinary ? buf.toString("base64") : text,
        encoding: hasBinary ? "base64" : "utf8",
      })
    }
  }
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) throw new Error("GITHUB_TOKEN kosong")
  const owner = process.env.GITHUB_OWNER || "ANONIMAHANGECROTSS"

  const me = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "jarotcompiler", Accept: "application/vnd.github+json" },
  })
  if (!me.ok) throw new Error(`Token tidak valid: ${me.status}`)
  const user = (await me.json()) as { login: string }
  console.log("token OK -> login:", user.login)

  if (!(await repoExists())) {
    await createRepo()
    console.log("repo dibuat:", repoSlug())
  } else {
    console.log("repo sudah ada:", repoSlug())
  }

  // ---- kumpulkan source webapp ----
  const files: GhRepoFile[] = []
  for (const d of INCLUDE_DIRS) collectFiles(join(ROOT, d), ROOT, files)
  for (const f of INCLUDE_FILES) {
    try {
      files.push({ path: `webapp/${f}`, content: readFileSync(join(ROOT, f), "utf8"), encoding: "utf8" })
    } catch {
      console.log("  skip (tidak ada):", f)
    }
  }

  // file repo-level
  files.push({ path: "README.md", content: readFileSync(`${ROOT}/scripts/repo-readme.md`, "utf8"), encoding: "utf8" })
  files.push({ path: ".gitignore", content: readFileSync("/tmp/repo-files/.gitignore", "utf8"), encoding: "utf8" })
  files.push({ path: "webapp/.env.example", content: readFileSync("/tmp/repo-files/.env.example", "utf8"), encoding: "utf8" })
  files.push({ path: ".github/workflows/build.yml", content: WORKFLOW_YML, encoding: "utf8" })
  files.push({ path: "jarot-icon.png", content: DEFAULT_ICON_BASE64, encoding: "base64" })

  // demo project native valid di root biar run yang ke-trigger oleh seed ini sukses
  const demoPkg = "com.jarot.app"
  files.push({
    path: "jarot.config.json",
    content: JSON.stringify({ appName: "JAROT", packageName: demoPkg, engine: "native" }, null, 2),
    encoding: "utf8",
  })
  for (const sf of scaffoldFor("native", "JAROT", demoPkg)) {
    files.push({ path: sf.path, content: sf.content, encoding: sf.encoding ?? "utf8" })
  }

  console.log(`total ${files.length} file (${files.filter((f) => f.encoding === "base64").length} base64)`)
  const totalBytes = files.reduce((a, f) => a + f.content.length, 0)
  console.log(`total bytes ~${(totalBytes / 1024).toFixed(0)} KB`)

  const sha = await pushFiles(files, "init: JAROTCOMPILER — webapp source + build engine workflows")
  console.log("seed commit:", sha)
  console.log("repo:", `https://github.com/${repoSlug()}`)
  writeFileSync("/tmp/seed-sha.txt", sha)
}

main().catch((e) => {
  console.error("GAGAL:", e?.message ?? e)
  process.exit(1)
})
