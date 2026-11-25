// JAROTCOMPILER — /api/projects/[id] : detail + delete
import { db } from "@/lib/db"
import { err, json, getProject } from "@/lib/jarot/server-helpers"
import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)

  const files = await db.projectFile.findMany({
    where: { projectId: id },
    select: { id: true, path: true, isFolder: true, encoding: true },
    orderBy: { path: "asc" },
  })

  const lastBuild = await db.build.findFirst({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
  })

  return json({
    project: {
      id: project.id,
      name: project.name,
      packageName: project.packageName,
      engine: project.engine,
      icon: project.icon,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    files,
    lastBuild: lastBuild
      ? { id: lastBuild.id, status: lastBuild.status, apkName: lastBuild.apkName }
      : null,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)
  await db.project.delete({ where: { id } })
  return json({ ok: true })
}
