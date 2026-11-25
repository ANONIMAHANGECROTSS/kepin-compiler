// JAROTCOMPILER — GitHub integration (server-side only).
// Uses the git data API to push a whole project as a single commit, which
// triggers the repo's APK build workflow (on: push), then tracks the Actions
// run and proxies the built APK artifact download.

const API = "https://api.github.com"

export type GhRepoFile = {
  path: string
  content: string
  encoding: "utf8" | "base64"
}

function creds() {
  const token = process.env.GITHUB_TOKEN
  const owner = process.env.GITHUB_OWNER || "ANONIMAHANGECROTSS"
  const repo = process.env.GITHUB_REPO || "kepin-compiler"
  if (!token) throw new Error("GITHUB_TOKEN belum diisi di .env")
  return { token, owner, repo }
}

async function gh<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { token } = creds()
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "jarotcompiler",
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`GitHub ${res.status} ${res.statusText}: ${body.slice(0, 400)}`)
  }
  // 204 no content
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export function repoSlug(): string {
  const { owner, repo } = creds()
  return `${owner}/${repo}`
}

export async function repoExists(): Promise<boolean> {
  const { owner, repo } = creds()
  try {
    await gh(`/repos/${owner}/${repo}`)
    return true
  } catch {
    return false
  }
}

export async function createRepo(): Promise<void> {
  const { repo } = creds()
  await gh("/user/repos", {
    method: "POST",
    body: JSON.stringify({
      name: repo,
      description: "Build engine APK untuk JAROTCOMPILER (Flutter & Native via GitHub Actions)",
      private: false,
      has_issues: false,
      has_wiki: false,
      auto_init: true, // creates README + initial commit on main
    }),
  })
}

/** Push all files as ONE commit on main. Returns the commit sha.
 *  `preserve` = path prefixes (folder with trailing "/" or exact file) that
 *  must survive this push even when absent from `files` (e.g. webapp/). */
export async function pushFiles(
  files: GhRepoFile[],
  message: string,
  preserve: string[] = []
): Promise<string> {
  const { owner, repo } = creds()

  const isPreserved = (p: string) =>
    preserve.some((pref) => p === pref || p.startsWith(pref.endsWith("/") ? pref : `${pref}/`))

  // 1) current head of main (may be empty repo)
  let headSha: string | null = null
  let baseTree: string | null = null
  try {
    const ref = await gh(`/repos/${owner}/${repo}/git/ref/heads/main`)
    headSha = ref.object.sha
    const commit = await gh(`/repos/${owner}/${repo}/git/commits/${headSha}`)
    baseTree = commit.tree.sha
  } catch {
    headSha = null
    baseTree = null
  }

  // 2) create blobs (parallel batches)
  const fileMap = new Map(files.map((f) => [f.path, f]))
  const shas: { path: string; sha: string }[] = []
  const BATCH = 8
  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH)
    const results = await Promise.all(
      batch.map(async (f) => {
        const blob = await gh<{ sha: string }>(
          `/repos/${owner}/${repo}/git/blobs`,
          {
            method: "POST",
            body: JSON.stringify({
              content: f.content,
              encoding: f.encoding === "base64" ? "base64" : "utf-8",
            }),
          }
        )
        return { path: f.path, sha: blob.sha }
      })
    )
    shas.push(...results)
  }

  // 2b) file lama di repo yang tidak ada di push ini dan tidak di-preserve -> deletion
  const deletions: { path: string; mode: "100644"; type: "blob"; sha: null }[] = []
  if (baseTree) {
    const existing = await gh<{ tree: { path: string; type: string }[]; truncated: boolean }>(
      `/repos/${owner}/${repo}/git/trees/${baseTree}?recursive=1`
    )
    for (const entry of existing.tree ?? []) {
      if (entry.type === "blob" && !fileMap.has(entry.path) && !isPreserved(entry.path)) {
        deletions.push({ path: entry.path, mode: "100644", type: "blob", sha: null })
      }
    }
  }

  // 3) tree
  const tree = await gh<{ sha: string }>(`/repos/${owner}/${repo}/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTree ?? undefined,
      tree: [
        ...shas.map((s) => ({ path: s.path, mode: "100644", type: "blob", sha: s.sha })),
        ...deletions,
      ],
    }),
  })

  // 4) commit
  const commit = await gh<{ sha: string }>(
    `/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: tree.sha,
        parents: headSha ? [headSha] : [],
      }),
    }
  )

  // 5) update ref (create main if needed)
  if (headSha) {
    await gh(`/repos/${owner}/${repo}/git/refs/heads/main`, {
      method: "PATCH",
      body: JSON.stringify({ sha: commit.sha, force: false }),
    })
  } else {
    await gh(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: "refs/heads/main", sha: commit.sha }),
    })
  }

  return commit.sha
}

export type RunInfo = {
  id: number
  status: string // queued | in_progress | completed
  conclusion: string | null // success | failure | null
  html_url: string
  head_sha: string
}

/** Find the most recent workflow run for a commit sha. */
export async function findRunForCommit(sha: string): Promise<RunInfo | null> {
  const { owner, repo } = creds()
  const runs = await gh<{ workflow_runs: RunInfo[] }>(
    `/repos/${owner}/${repo}/actions/runs?per_page=20`
  )
  return (
    runs.workflow_runs.find((r) => r.head_sha === sha) ?? null
  )
}

export async function getRun(runId: number): Promise<RunInfo> {
  const { owner, repo } = creds()
  return gh<RunInfo>(`/repos/${owner}/${repo}/actions/runs/${runId}`)
}

export type ArtifactInfo = {
  id: number
  name: string
  size_in_bytes: number
  expired: boolean
}

export async function listArtifacts(runId: number): Promise<ArtifactInfo[]> {
  const { owner, repo } = creds()
  const res = await gh<{ artifacts: ArtifactInfo[] }>(
    `/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`
  )
  return res.artifacts ?? []
}

/** Download the build artifact zip and extract the APK. */
export async function downloadApk(
  runId: number
): Promise<{ buffer: Buffer; filename: string }> {
  const { token, owner, repo } = creds()
  const arts = await listArtifacts(runId)
  const art = arts.find((a) => !a.expired) ?? arts[0]
  if (!art) throw new Error("Artifact build tidak ditemukan (mungkin sudah expired)")

  const res = await fetch(
    `${API}/repos/${owner}/${repo}/actions/artifacts/${art.id}/zip`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "jarotcompiler",
      },
      redirect: "follow",
    }
  )
  if (!res.ok) throw new Error(`Gagal download artifact: ${res.status}`)
  const zipBuf = Buffer.from(await res.arrayBuffer())

  const JSZip = (await import("jszip")).default
  const zip = await JSZip.loadAsync(zipBuf)
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
  const apkName = names.find((n) => n.toLowerCase().endsWith(".apk"))
  if (!apkName) throw new Error("APK tidak ditemukan di dalam artifact")
  const buffer = await zip.files[apkName].async("nodebuffer")
  return { buffer, filename: apkName.split("/").pop() || "app-release.apk" }
}
