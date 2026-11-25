// JAROTCOMPILER — /api/builds/[id] : status build (dipoll dari UI)
import { db } from "@/lib/db"
import { err, json } from "@/lib/jarot/server-helpers"
import { findRunForCommit, getRun, repoSlug } from "@/lib/jarot/github"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const build = await db.build.findUnique({ where: { id } })
  if (!build) return err("Build tidak ditemukan", 404)

  const project = await db.project.findUnique({ where: { id: build.projectId } })

  // refresh status dari GitHub Actions kalau masih jalan
  if (build.status === "building" || build.status === "uploading") {
    try {
      let runId = build.runId ? Number(build.runId) : null
      if (!runId && build.headSha) {
        const run = await findRunForCommit(build.headSha)
        if (run) {
          runId = run.id
          await db.build.update({
            where: { id },
            data: { runId: BigInt(run.id), runUrl: run.html_url },
          })
        }
      }
      if (runId) {
        const run = await getRun(runId)
        if (run.status === "completed") {
          const success = run.conclusion === "success"
          await db.build.update({
            where: { id },
            data: {
              status: success ? "success" : "failed",
              message:
                run.conclusion === "failure"
                  ? "Build gagal, cek log di GitHub Actions"
                  : `Selesai: ${run.conclusion ?? "unknown"}`,
              runUrl: run.html_url,
              apkName: success ? `${project?.name ?? "app"}.apk` : null,
            },
          })
          build.status = success ? "success" : "failed"
          build.runUrl = run.html_url
          build.apkName = success ? `${project?.name ?? "app"}.apk` : null
        } else if (run.status === "in_progress" || run.status === "queued") {
          build.status = "building"
          build.runUrl = run.html_url
        }
      }
    } catch (e: any) {
      // biarkan status terakhir, jangan crash polling
      console.error("poll error:", e?.message)
    }
  }

  return json({
    id: build.id,
    projectId: build.projectId,
    status: build.status,
    message: build.message,
    runUrl: build.runUrl ?? (build.runId ? `https://github.com/${repoSlug()}/actions/runs/${build.runId}` : null),
    apkName: build.apkName,
    engine: project?.engine ?? null,
    appName: project?.name ?? null,
    createdAt: build.createdAt,
    updatedAt: build.updatedAt,
  })
}
