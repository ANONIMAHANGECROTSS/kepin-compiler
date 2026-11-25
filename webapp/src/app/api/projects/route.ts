// JAROTCOMPILER — /api/projects
import { db } from "@/lib/db"
import { NextResponse } from "next/server"
import { scaffoldFor, scaffoldFolders, normalizePackage, packageError, type Engine } from "@/lib/jarot/scaffolds"
import { DEFAULT_ICON_BASE64 } from "@/lib/jarot/icon"
import { err, json } from "@/lib/jarot/server-helpers"

export async function GET() {
  const projects = await db.project.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { files: true, builds: true } },
      builds: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  })
  return json(
    projects.map((p) => ({
      id: p.id,
      name: p.name,
      packageName: p.packageName,
      engine: p.engine,
      icon: p.icon,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      fileCount: p._count.files,
      lastBuildStatus: p.builds[0]?.status ?? null,
    }))
  )
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return err("Body JSON tidak valid")
  }

  const name = (body?.name ?? "").toString().trim()
  if (!name) return err("Nama APK wajib diisi")
  if (name.length > 60) return err("Nama APK maksimal 60 karakter")

  const engine: Engine = body?.engine === "flutter" ? "flutter" : body?.engine === "native" ? "native" : null
  if (!engine) return err("Engine harus flutter atau native")

  let packageName = normalizePackage((body?.packageName ?? "").toString())
  const pkgErr = packageError(packageName)
  if (pkgErr) return err(pkgErr)

  // icon: data URL dari client atau default JAROT icon
  let iconBase64 = DEFAULT_ICON_BASE64
  const icon = body?.icon
  if (typeof icon === "string" && icon.startsWith("data:image/png;base64,")) {
    iconBase64 = icon.slice("data:image/png;base64,".length)
  }

  const project = await db.project.create({
    data: {
      name,
      engine,
      packageName,
      icon: `data:image/png;base64,${iconBase64}`,
    },
  })

  // generate scaffold files (manifest, gradle, main.dart, dll)
  const files = scaffoldFor(engine, name, packageName)
  for (const f of files) {
    await db.projectFile.create({
      data: {
        projectId: project.id,
        path: f.path,
        content: f.content,
        encoding: f.encoding ?? "utf8",
      },
    })
  }
  for (const folder of scaffoldFolders(engine, packageName)) {
    await db.projectFile.upsert({
      where: { projectId_path: { projectId: project.id, path: folder } },
      create: { projectId: project.id, path: folder, isFolder: true },
      update: {},
    })
  }

  return json({ id: project.id, name, engine, packageName }, 201)
}
