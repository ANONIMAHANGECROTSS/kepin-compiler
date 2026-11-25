// JAROTCOMPILER — /api/projects/[id]/files : create file or folder
import { db } from "@/lib/db"
import { err, json, getProject, normalizePath, ensureFolders } from "@/lib/jarot/server-helpers"
import { templateFor } from "@/lib/jarot/scaffolds"

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

  const path = normalizePath((body?.path ?? "").toString())
  if (!path) return err("Path file tidak valid")

  const isFolder = body?.isFolder === true

  const existing = await db.projectFile.findUnique({
    where: { projectId_path: { projectId: id, path } },
  })
  if (existing) return err(`"${path}" sudah ada di project ini`)

  if (isFolder) {
    const folder = await db.projectFile.create({
      data: { projectId: id, path, isFolder: true },
    })
    await ensureFolders(id, path)
    return json({ id: folder.id, path, isFolder: true }, 201)
  }

  // content: dari client, atau template otomatis sesuai ekstensi
  let content = typeof body?.content === "string" ? body.content : null
  let encoding = "utf8"
  if (content === null) {
    content = templateFor(path)
  }
  if (typeof body?.encoding === "string" && body.encoding === "base64") {
    encoding = "base64"
    content = (body?.content ?? "").toString()
  }

  const file = await db.projectFile.create({
    data: { projectId: id, path, isFolder: false, content, encoding },
  })
  await ensureFolders(id, path)
  await db.project.update({ where: { id }, data: { updatedAt: new Date() } })
  return json({ id: file.id, path, isFolder: false }, 201)
}
