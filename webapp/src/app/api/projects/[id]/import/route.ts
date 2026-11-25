// JAROTCOMPILER — /api/projects/[id]/import : terapkan base ZIP ke project
// Client membaca ZIP dengan JSZip lalu kirim array file:
// [{ path, content, encoding: "utf8" | "base64" }]
// mode "replace" = ganti seluruh isi project, mode "merge" = timpa path sama saja.
import { db } from "@/lib/db"
import { err, json, getProject, normalizePath, ensureFolders } from "@/lib/jarot/server-helpers"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)

  let body: any
  try {
    body = await req.json()
  } catch {
    return err("Body JSON tidak valid")
  }

  const mode = body?.mode === "replace" ? "replace" : "merge"
  const incoming: any[] = Array.isArray(body?.files) ? body.files : []
  if (incoming.length === 0) return err("ZIP kosong atau tidak ada file yang terbaca")

  if (incoming.length > 600) return err("Terlalu banyak file (maks 600)")

  // validasi semua path dulu, biar atomik
  const cleaned: { path: string; content: string; encoding: string }[] = []
  const seen = new Set<string>()
  for (const f of incoming) {
    const path = normalizePath((f?.path ?? "").toString())
    if (!path) return err(`Path tidak valid di dalam ZIP: "${f?.path}"`)
    if (path === "jarot.config.json" || path === "jarot-icon.png" || path.startsWith(".github/")) {
      // file sistem build, lewati
      continue
    }
    const encoding = f?.encoding === "base64" ? "base64" : "utf8"
    const content = (f?.content ?? "").toString()
    if (content.length > 400_000) return err(`File ${path} terlalu besar (maks 400KB per file)`)
    if (!seen.has(path)) {
      seen.add(path)
      cleaned.push({ path, content, encoding })
    }
  }
  if (cleaned.length === 0) return err("Tidak ada file valid di dalam ZIP")

  if (mode === "replace") {
    await db.projectFile.deleteMany({ where: { projectId: id } })
  } else {
    await db.projectFile.deleteMany({
      where: { projectId: id, path: { in: cleaned.map((c) => c.path) } },
    })
  }

  for (const c of cleaned) {
    await db.projectFile.create({
      data: { projectId: id, path: c.path, content: c.content, encoding: c.encoding },
    })
    await ensureFolders(id, c.path)
  }

  await db.project.update({ where: { id }, data: { updatedAt: new Date() } })

  return json({ ok: true, imported: cleaned.length, mode })
}
