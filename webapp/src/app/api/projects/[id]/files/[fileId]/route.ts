// JAROTCOMPILER — /api/projects/[id]/files/[fileId] : read / save / rename / delete
import { db } from "@/lib/db"
import { err, json, getProject, normalizePath, ensureFolders } from "@/lib/jarot/server-helpers"

async function getFile(id: string, fileId: string) {
  return db.projectFile.findFirst({ where: { id: fileId, projectId: id } })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)
  const file = await getFile(id, fileId)
  if (!file) return err("File tidak ditemukan", 404)
  return json({
    id: file.id,
    path: file.path,
    isFolder: file.isFolder,
    encoding: file.encoding,
    content: file.content ?? "",
    updatedAt: file.updatedAt,
  })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)
  const file = await getFile(id, fileId)
  if (!file) return err("File tidak ditemukan", 404)

  let body: any
  try {
    body = await req.json()
  } catch {
    return err("Body JSON tidak valid")
  }

  const data: any = {}

  // rename / move
  if (typeof body?.path === "string") {
    const newPath = normalizePath(body.path)
    if (!newPath) return err("Path baru tidak valid")
    if (newPath !== file.path) {
      const dup = await db.projectFile.findUnique({
        where: { projectId_path: { projectId: id, path: newPath } },
      })
      if (dup) return err(`"${newPath}" sudah ada`)
      data.path = newPath
      if (file.isFolder) {
        // move descendants too
        const descendants = await db.projectFile.findMany({
          where: { projectId: id, path: { startsWith: `${file.path}/` } },
        })
        for (const d of descendants) {
          await db.projectFile.update({
            where: { id: d.id },
            data: { path: d.path.replace(`${file.path}/`, `${newPath}/`) },
          })
        }
      } else {
        await ensureFolders(id, newPath)
      }
    }
  }

  // save content
  if (typeof body?.content === "string") {
    data.content = body.content
  }
  if (body?.encoding === "base64" || body?.encoding === "utf8") {
    data.encoding = body.encoding
  }

  if (Object.keys(data).length === 0) return err("Tidak ada perubahan")

  const updated = await db.projectFile.update({ where: { id: fileId }, data })
  await db.project.update({ where: { id }, data: { updatedAt: new Date() } })
  return json({ id: updated.id, path: updated.path })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { id, fileId } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)
  const file = await getFile(id, fileId)
  if (!file) return err("File tidak ditemukan", 404)

  if (file.isFolder) {
    // delete folder + semua isinya
    await db.projectFile.deleteMany({
      where: { projectId: id, OR: [{ path: file.path }, { path: { startsWith: `${file.path}/` } }] },
    })
  } else {
    await db.projectFile.delete({ where: { id: fileId } })
  }
  await db.project.update({ where: { id }, data: { updatedAt: new Date() } })
  return json({ ok: true })
}
