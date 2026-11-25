// Test build APK end-to-end langsung via GitHub (logic sama dengan API route /build).
// Pakai: bun scripts/test-build.ts <engine>
import { db } from "@/lib/db"
import { pushFiles, findRunForCommit, getRun, downloadApk, repoSlug } from "@/lib/jarot/github"
import { WORKFLOW_YML } from "@/lib/jarot/workflow"

const engine = (process.argv[2] || "native") as "native" | "flutter"

const project = await db.project.findFirst({ where: { engine } })
if (!project) throw new Error(`tidak ada project ${engine} di DB`)
const files = await db.projectFile.findMany({ where: { projectId: project.id, isFolder: false } })

const iconB64 = (project.icon ?? "").replace(/^data:image\/png;base64,/, "")

const repoFiles = [
  { path: ".github/workflows/build.yml", content: WORKFLOW_YML, encoding: "utf8" as const },
  {
    path: "jarot.config.json",
    content: JSON.stringify({ appName: project.name, packageName: project.packageName, engine: project.engine }, null, 2),
    encoding: "utf8" as const,
  },
  { path: "jarot-icon.png", content: iconB64, encoding: "base64" as const },
  ...files.map((f) => ({
    path: f.path,
    content: f.content ?? "",
    encoding: (f.encoding === "base64" ? "base64" : "utf8") as "base64" | "utf8",
  })),
]

console.log(`push ${repoFiles.length} file ke ${repoSlug()} ...`)
const t0 = Date.now()
const sha = await pushFiles(repoFiles, `build: ${project.name} (${engine})`)
console.log("commit:", sha, `${((Date.now() - t0) / 1000).toFixed(1)}s`)

// tunggu workflow run muncul & selesai
let run = null as any
for (let i = 0; i < 30; i++) {
  run = await findRunForCommit(sha)
  if (run) break
  await new Promise((r) => setTimeout(r, 2000))
}
if (!run) throw new Error("workflow run tidak muncul (push tidak trigger?)")
console.log("run:", run.id, run.html_url)

while (true) {
  const info = await getRun(run.id)
  const el = ((Date.now() - t0) / 1000).toFixed(0)
  console.log(`[${el}s] run ${info.status} / ${info.conclusion ?? "-"}`)
  if (info.status === "completed") break
  await new Promise((r) => setTimeout(r, 15000))
  if (Date.now() - t0 > 560_000) throw new Error("timeout menunggu run")
}

if (run && (await getRun(run.id)).conclusion === "success") {
  console.log("SUKSES, download artifact...")
  const { buffer, filename } = await downloadApk(run.id)
  const out = `/tmp/jarot-${engine}.apk`
  const { writeFileSync } = await import("fs")
  writeFileSync(out, buffer)
  console.log(`APK tersimpan: ${out} (${filename}, ${(buffer.length / 1024 / 1024).toFixed(2)} MB)`)
} else {
  console.log("GAGAL — cek log:", `https://github.com/${repoSlug()}/actions/runs/${run.id}`)
  process.exitCode = 1
}
