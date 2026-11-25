// JAROTCOMPILER — client-side API helpers

export type Engine = "flutter" | "native"

export type ProjectCard = {
  id: string
  name: string
  packageName: string
  engine: Engine
  icon: string | null
  createdAt: string
  updatedAt: string
  fileCount: number
  lastBuildStatus: string | null
}

export type FileMeta = {
  id: string
  path: string
  isFolder: boolean
  encoding: string
}

export type FileFull = FileMeta & {
  content: string
  updatedAt: string
}

export type BuildInfo = {
  id: string
  projectId: string
  status: "queued" | "uploading" | "building" | "success" | "failed"
  message: string | null
  runUrl: string | null
  apkName: string | null
  engine: Engine | null
  appName: string | null
  createdAt: string
  updatedAt: string
}

async function http<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as any)?.error || `Gagal: ${res.status}`)
  return data as T
}

export const api = {
  listProjects: () => http<ProjectCard[]>("/api/projects"),

  getProject: (id: string) =>
    http<{ project: any; files: FileMeta[]; lastBuild: { id: string; status: string; apkName: string | null } | null }>(
      `/api/projects/${id}`
    ),

  createProject: (payload: { name: string; packageName: string; engine: Engine; icon?: string }) =>
    http<{ id: string }>("/api/projects", { method: "POST", body: JSON.stringify(payload) }),

  deleteProject: (id: string) => http<{ ok: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),

  getFile: (projectId: string, fileId: string) =>
    http<FileFull>(`/api/projects/${projectId}/files/${fileId}`),

  createFile: (projectId: string, payload: { path: string; isFolder: boolean; content?: string }) =>
    http<{ id: string }>(`/api/projects/${projectId}/files`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  saveFile: (projectId: string, fileId: string, content: string) =>
    http<{ id: string }>(`/api/projects/${projectId}/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    }),

  renameFile: (projectId: string, fileId: string, path: string) =>
    http<{ id: string }>(`/api/projects/${projectId}/files/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ path }),
    }),

  deleteFile: (projectId: string, fileId: string) =>
    http<{ ok: boolean }>(`/api/projects/${projectId}/files/${fileId}`, { method: "DELETE" }),

  importZip: (
    projectId: string,
    payload: { files: { path: string; content: string; encoding: string }[]; mode: "merge" | "replace" }
  ) =>
    http<{ imported: number; mode: string }>(`/api/projects/${projectId}/import`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  startBuild: (projectId: string) =>
    http<{ buildId: string; status: string }>(`/api/projects/${projectId}/build`, { method: "POST" }),

  getBuild: (buildId: string) => http<BuildInfo>(`/api/builds/${buildId}`),
}

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s} dtk lalu`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} mnt lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  return `${d} hr lalu`
}
