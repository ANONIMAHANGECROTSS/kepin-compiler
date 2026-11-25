// JAROTCOMPILER — /api/projects/[id]/build : push project ke repo kepin-compiler
// (git data API, satu commit), workflow build APK ter-trigger on: push.
import { db } from "@/lib/db"
import { err, json, getProject } from "@/lib/jarot/server-helpers"
import { pushFiles, repoExists, createRepo, type GhRepoFile } from "@/lib/jarot/github"
import { WORKFLOW_YML } from "@/lib/jarot/workflow"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const project = await getProject(id)
  if (!project) return err("Project tidak ditemukan", 404)

  const files = await db.projectFile.findMany({
    where: { projectId: id, isFolder: false },
  })
  if (files.length === 0) return err("Project masih kosong, tidak ada yang di-build")

  // pastikan repo engine ada (sekali saja)
  if (!(await repoExists())) {
    try {
      await createRepo()
    } catch (e: any) {
      return err(`Repo engine belum siap: ${String(e?.message ?? e).slice(0, 300)}`, 502)
    }
  }

  const build = await db.build.create({
    data: { projectId: id, status: "uploading" },
  })

  const iconB64 = (project.icon ?? "").replace(/^data:image\/png;base64,/, "")

  const repoFiles: GhRepoFile[] = [
    { path: ".github/workflows/build.yml", content: WORKFLOW_YML, encoding: "utf8" },
    {
      path: "jarot.config.json",
      content: JSON.stringify(
        {
          appName: project.name,
          packageName: project.packageName,
          engine: project.engine,
          builtBy: "JAROTCOMPILER",
        },
        null,
        2
      ),
      encoding: "utf8",
    },
    { path: "jarot-icon.png", content: iconB64, encoding: "base64" },
    ...files.map((f) => ({
      path: f.path,
      content: f.content ?? "",
      encoding: (f.encoding === "base64" ? "base64" : "utf8") as "base64" | "utf8",
    })),
  ]

  try {
    // webapp/, README.md, .gitignore = source platform JAROTCOMPILER di repo — jangan ditimpa
    const headSha = await pushFiles(
      repoFiles,
      `build: ${project.name} (${project.engine})`,
      ["webapp/", "README.md", ".gitignore", ".env.example"]
    )
    await db.build.update({
      where: { id: build.id },
      data: { headSha, status: "building" },
    })
  } catch (e: any) {
    await db.build.update({
      where: { id: build.id },
      data: { status: "failed", message: String(e?.message ?? e).slice(0, 500) },
    })
    return err(`Gagal push ke GitHub: ${String(e?.message ?? e).slice(0, 300)}`, 502)
  }

  return json({ buildId: build.id, status: "building" }, 201)
}
