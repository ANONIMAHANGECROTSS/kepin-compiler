// Shared server helpers for JAROTCOMPILER API routes.
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export function json(data: any, status = 200) {
  return NextResponse.json(data, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

/** Normalize a project-relative path: no leading slash, no "..", no backslash. */
export function normalizePath(raw: string): string | null {
  if (typeof raw !== "string") return null
  let p = raw.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "")
  if (!p) return null
  const parts = p.split("/").filter((s) => s.length > 0)
  if (parts.some((s) => s === "." || s === "..")) return null
  p = parts.join("/")
  if (p.includes("\0")) return null
  if (p.length > 300) return null
  return p
}

export async function getProject(id: string) {
  const project = await db.project.findUnique({ where: { id } })
  return project
}

/** Ensure parent folder rows exist so the tree renders real structure. */
export async function ensureFolders(projectId: string, filePath: string) {
  const parts = filePath.split("/")
  parts.pop() // drop filename
  let cur = ""
  for (const part of parts) {
    cur = cur ? `${cur}/${part}` : part
    await db.projectFile.upsert({
      where: { projectId_path: { projectId, path: cur } },
      create: { projectId, path: cur, isFolder: true },
      update: {},
    })
  }
}
