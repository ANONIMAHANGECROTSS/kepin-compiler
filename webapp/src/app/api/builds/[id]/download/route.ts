// JAROTCOMPILER — /api/builds/[id]/download : unduh APK hasil build (proxy artifact)
import { db } from "@/lib/db"
import { err } from "@/lib/jarot/server-helpers"
import { downloadApk } from "@/lib/jarot/github"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const build = await db.build.findUnique({ where: { id } })
  if (!build) return err("Build tidak ditemukan", 404)
  if (build.status !== "success" || !build.runId) {
    return err("APK belum siap, build harus sukses dulu", 409)
  }

  try {
    const { buffer, filename } = await downloadApk(Number(build.runId))
    const niceName = (build.apkName || filename || "app-release.apk").replace(/[^\w.\- ]/g, "_")
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": `attachment; filename="${niceName}"`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "no-store",
      },
    })
  } catch (e: any) {
    return err(String(e?.message ?? e).slice(0, 300), 502)
  }
}
