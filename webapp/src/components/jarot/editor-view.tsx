"use client"

// JAROTCOMPILER — editor page (mobile-first):
// ☰ kiri atas = drawer file explorer (CRUD file/folder + import ZIP),
// tengah = nama file + tombol simpan, isi = code editor,
// bawah = tombol BUILD APK (popup progress via GitHub Actions).

import { useCallback, useEffect, useRef, useState } from "react"
import {
  ChevronLeft, Save, Menu, Loader2, FilePlus2, FolderPlus, FileArchive,
  Trash2, Rocket, Cpu, Waves, LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { FileTree } from "@/components/jarot/file-tree"
import BuildSheet from "@/components/jarot/build-sheet"
import { api, type FileMeta, type FileFull } from "@/lib/jarot/client"
import { toast } from "sonner"

type ProjectInfo = {
  id: string
  name: string
  packageName: string
  engine: string
  icon: string | null
}

const MAIN_HINTS: Record<string, string[]> = {
  flutter: ["lib/main.dart"],
  native: ["MainActivity.java", "AndroidManifest.xml"],
}

type ZipEntry = { path: string; content: string; encoding: string }

export default function EditorView({ projectId, onExit }: { projectId: string; onExit: () => void }) {
  const [project, setProject] = useState<ProjectInfo | null>(null)
  const [files, setFiles] = useState<FileMeta[] | null>(null)
  const [active, setActive] = useState<FileFull | null>(null)
  const [content, setContent] = useState("")
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // dialogs
  const [newFileDialog, setNewFileDialog] = useState(false)
  const [newFolderDialog, setNewFolderDialog] = useState(false)
  const [renameTarget, setRenameTarget] = useState<FileMeta | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileMeta | null>(null)
  const [importDialog, setImportDialog] = useState(false)
  const [zipEntries, setZipEntries] = useState<ZipEntry[] | null>(null)
  const [zipMode, setZipMode] = useState<"merge" | "replace">("merge")
  const [importing, setImporting] = useState(false)
  const [inputValue, setInputValue] = useState("")
  const [busy, setBusy] = useState(false)

  // build
  const [buildId, setBuildId] = useState<string | null>(null)
  const [buildSheetOpen, setBuildSheetOpen] = useState(false)
  const [building, setBuilding] = useState(false)

  const zipInputRef = useRef<HTMLInputElement>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const loadProject = useCallback(async () => {
    try {
      const data = await api.getProject(projectId)
      setProject(data.project)
      setFiles(data.files)
      return data
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memuat project")
      return null
    }
  }, [projectId])

  useEffect(() => {
    ;(async () => {
      const data = await loadProject()
      if (!data) return
      const hints = MAIN_HINTS[data.project.engine] ?? []
      const first =
        data.files.find((f) => !f.isFolder && hints.some((h) => f.path.endsWith(h))) ??
        data.files.find((f) => !f.isFolder)
      if (first) await selectFile(first, data.files)
    })()
  }, [projectId])

  const selectFile = async (meta: FileMeta, list: FileMeta[] = files ?? []) => {
    // auto-save diam-diam kalau ada perubahan belum tersimpan
    if (active && dirty) {
      await saveFile(true)
    }
    try {
      const full = await api.getFile(projectId, meta.id)
      setActive(full)
      setContent(full.encoding === "base64" ? "" : full.content)
      setDirty(false)
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuka file")
    }
  }

  const saveFile = useCallback(
    async (silent = false) => {
      if (!active || !dirty || active.encoding === "base64") return
      setSaving(true)
      try {
        await api.saveFile(projectId, active.id, content)
        setDirty(false)
        if (!silent) toast.success("Tersimpan")
        setActive((a) => (a ? { ...a, content } : a))
      } catch (e: any) {
        toast.error(e?.message ?? "Gagal simpan")
      } finally {
        setSaving(false)
      }
    },
    [active, dirty, content, projectId]
  )

  const refreshTree = async () => {
    const data = await api.getProject(projectId)
    setFiles(data.files)
    setProject(data.project)
    return data
  }

  // ---------- CRUD file ----------
  const createEntry = async (isFolder: boolean) => {
    const path = inputValue.trim()
    if (!path) {
      toast.error("Path wajib diisi")
      return
    }
    setBusy(true)
    try {
      const res = await api.createFile(projectId, { path, isFolder })
      const data = await refreshTree()
      toast.success(isFolder ? "Folder dibuat" : "File dibuat")
      if (!isFolder) {
        const meta = data.files.find((f) => f.id === res.id)
        if (meta) await selectFile(meta, data.files)
      }
      setInputValue("")
      if (!isFolder) setNewFileDialog(false)
      else setNewFolderDialog(false)
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal membuat")
    } finally {
      setBusy(false)
    }
  }

  const doRename = async () => {
    if (!renameTarget) return
    const path = inputValue.trim()
    if (!path || path === renameTarget.path) {
      setRenameTarget(null)
      return
    }
    setBusy(true)
    try {
      await api.renameFile(projectId, renameTarget.id, path)
      await refreshTree()
      toast.success("Di-rename")
      setRenameTarget(null)
      setInputValue("")
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal rename")
    } finally {
      setBusy(false)
    }
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await api.deleteFile(projectId, deleteTarget.id)
      const wasActive = active?.id === deleteTarget.id || (deleteTarget.isFolder && active?.path.startsWith(`${deleteTarget.path}/`))
      const data = await refreshTree()
      toast.success(`"${deleteTarget.path}" dihapus`)
      if (wasActive) {
        const first = data.files.find((f) => !f.isFolder)
        if (first) await selectFile(first, data.files)
        else {
          setActive(null)
          setContent("")
        }
      }
      setDeleteTarget(null)
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal hapus")
    } finally {
      setBusy(false)
    }
  }

  // ---------- IMPORT ZIP ----------
  const handleZipFile = async (file: File) => {
    try {
      const JSZip = (await import("jszip")).default
      const zip = await JSZip.loadAsync(file)
      const entries: ZipEntry[] = []
      const paths: string[] = []

      zip.forEach((relPath, entry) => {
        if (entry.dir) return
        if (relPath.startsWith("__MACOSX/") || relPath.includes("/__MACOSX/") || relPath.includes("/.DS_Store")) return
        if (relPath.split("/").pop()?.startsWith(".DS_Store")) return
        paths.push(relPath)
      })

      if (paths.length === 0) {
        toast.error("ZIP kosong atau tidak ada file terbaca")
        return
      }
      if (paths.length > 600) {
        toast.error(`Terlalu banyak file: ${paths.length} (maks 600)`)
        return
      }

      // strip folder root kalau semua file ada di bawah satu folder yang sama
      let strip = ""
      const firstSegs = paths.map((p) => p.split("/")[0])
      if (paths.every((p) => p.includes("/")) && new Set(firstSegs).size === 1) {
        strip = `${firstSegs[0]}/`
      }

      let binary = 0
      for (const path of paths) {
        const entry = zip.file(path)
        if (!entry) continue
        const norm = path.slice(strip.length ? path.startsWith(strip) ? strip.length : 0 : 0)
        const uint8 = await entry.async("uint8array")
        let text: string | null = null
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(uint8)
          // heuristik karakter aneh
        } catch {
          text = null
        }
        if (text !== null && !text.includes("\uFFFD")) {
          entries.push({ path: norm, content: text, encoding: "utf8" })
        } else {
          // base64 via chunked btoa
          let bin = ""
          for (let i = 0; i < uint8.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + 0x8000)) as any)
          }
          entries.push({ path: norm, content: btoa(bin), encoding: "base64" })
          binary++
        }
      }

      setZipEntries(entries)
      setZipMode("merge")
      setImportDialog(true)
      void binary
    } catch (e: any) {
      toast.error(e?.message ?? "ZIP gagal dibaca")
    }
  }

  const applyImport = async () => {
    if (!zipEntries) return
    setImporting(true)
    try {
      const res = await api.importZip(projectId, { files: zipEntries, mode: zipMode })
      toast.success(`${res.imported} file diimpor (${res.mode === "replace" ? "ganti semua" : "gabung"})`)
      setImportDialog(false)
      setZipEntries(null)
      const data = await refreshTree()
      const first = data.files.find((f) => !f.isFolder)
      if (first) await selectFile(first, data.files)
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal import")
    } finally {
      setImporting(false)
    }
  }

  // ---------- BUILD ----------
  const startBuild = async () => {
    if (dirty && active && active.encoding !== "base64") await saveFile(true)
    setBuilding(true)
    try {
      const res = await api.startBuild(projectId)
      setBuildId(res.buildId)
      setBuildSheetOpen(true)
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mulai build")
    } finally {
      setBuilding(false)
    }
  }

  const isFlutter = project?.engine === "flutter"
  const lineCount = content.length ? content.split("\n").length : 0
  const isBinaryActive = active?.encoding === "base64"

  if (!project || !files) {
    return (
      <div className="flex h-[100dvh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#A6E22E]" />
      </div>
    )
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      {/* header */}
      <header className="flex h-14 shrink-0 items-center gap-1 border-b border-white/5 bg-[#0C0F14] px-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDrawerOpen(true)}
          aria-label="Buka explorer file"
          className="size-10 text-[#EDF2F7] active:bg-white/5"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate font-mono text-xs font-medium leading-none">
            {active ? active.path.split("/").pop() : project.name}
          </div>
          <div className="mt-1 truncate font-mono text-[10px] text-[#8A94A6] leading-none">
            {active ? active.path : "pilih file di explorer"}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => saveFile()}
          disabled={!dirty || saving || isBinaryActive}
          aria-label="Simpan file"
          className="relative size-10 text-[#EDF2F7] active:bg-white/5"
        >
          <Save className={`h-5 w-5 ${dirty ? "text-[#A6E22E]" : ""}`} />
          {dirty && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#A6E22E]" />}
        </Button>
      </header>

      {/* editor */}
      <main className="relative flex-1 min-h-0 bg-[#0C0F14]">
        {isBinaryActive ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <FileArchive className="h-10 w-10 text-[#8A94A6]" />
            <p className="text-sm text-[#8A94A6]">
              File <span className="font-mono text-[#EDF2F7]">{active?.path}</span> berisi data biner.
              <br />
              Tetap terpasang di project &amp; ikut di-build.
            </p>
          </div>
        ) : active ? (
          <textarea
            ref={editorRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value)
              setDirty(true)
            }}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                e.preventDefault()
                const ta = e.currentTarget
                const s = ta.selectionStart
                const next = ta.value.slice(0, s) + "  " + ta.value.slice(ta.selectionEnd)
                setContent(next)
                setDirty(true)
                requestAnimationFrame(() => {
                  ta.selectionStart = ta.selectionEnd = s + 2
                })
              }
            }}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            aria-label={`Editor ${active.path}`}
            className="h-full w-full resize-none bg-transparent p-4 font-mono text-[13px] leading-6 text-[#EDF2F7] caret-[#A6E22E] outline-none placeholder:text-[#8A94A6]"
            placeholder="// ketik kodenya di sini"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="grid size-14 place-items-center rounded-2xl border border-white/10 bg-[#141920] font-mono text-2xl text-[#A6E22E]">»</div>
            <p className="text-sm text-[#8A94A6]">
              Belum ada file terbuka.
              <br />
              Buka <span className="text-[#EDF2F7]">☰</span> untuk pilih file, bikin baru, atau import ZIP.
            </p>
          </div>
        )}
      </main>

      {/* status bar */}
      <div className="flex h-7 shrink-0 items-center gap-2 border-t border-white/5 bg-[#0C0F14] px-3 font-mono text-[10px] text-[#8A94A6]">
        <span className="inline-flex items-center gap-1 text-[#A6E22E]">
          {isFlutter ? <Waves className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
          {project.engine}
        </span>
        <span className="truncate">{active ? `${active.path} · ${lineCount} ln` : project.packageName}</span>
        <span className="ml-auto shrink-0">{dirty ? "belum disimpan" : saving ? "menyimpan" : "tersimpan"}</span>
      </div>

      {/* BUILD APK */}
      <div className="shrink-0 border-t border-white/5 bg-[#0C0F14] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          onClick={startBuild}
          disabled={building}
          className="h-12 w-full rounded-xl bg-[#A6E22E] text-[15px] font-bold text-[#0C0F14] hover:bg-[#B7E94A] active:translate-y-px active:brightness-90"
        >
          {building ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Mengirim build
            </>
          ) : (
            <>
              <Rocket className="h-5 w-5" /> BUILD APK
            </>
          )}
        </Button>
      </div>

      {/* ---------- drawer file explorer ---------- */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[86vw] sm:max-w-[86vw] border-white/10 bg-[#141920] p-0 flex flex-col data-[state=open]:shadow-[8px_0_40px_rgba(0,0,0,0.6)]"
        >
          <SheetHeader className="p-3 pb-2 border-b border-white/5 space-y-1.5">
            <div className="flex items-center gap-3">
              {project.icon && (
                <img src={project.icon} alt={`Icon ${project.name}`} className="size-10 rounded-lg border border-white/10 object-cover" />
              )}
              <div className="min-w-0">
                <SheetTitle className="truncate text-left text-sm font-semibold leading-none">{project.name}</SheetTitle>
                <SheetDescription className="mt-1 truncate text-left font-mono text-[10px] leading-none">{project.packageName}</SheetDescription>
              </div>
              <span className="ml-auto shrink-0 inline-flex items-center gap-1 rounded-md border border-[#A6E22E]/30 bg-[#A6E22E]/10 px-1.5 py-0.5 font-mono text-[10px] uppercase text-[#A6E22E]">
                {isFlutter ? <Waves className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
                {project.engine}
              </span>
            </div>
          </SheetHeader>

          {/* aksi */}
          <div className="grid grid-cols-3 gap-1.5 p-3 border-b border-white/5">
            <Button variant="outline" size="sm" onClick={() => { setInputValue(""); setNewFileDialog(true) }} className="h-9 rounded-lg border-white/10 bg-[#1B222C] text-[11px] text-[#EDF2F7] gap-1.5">
              <FilePlus2 className="h-3.5 w-3.5" /> File
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setInputValue(""); setNewFolderDialog(true) }} className="h-9 rounded-lg border-white/10 bg-[#1B222C] text-[11px] text-[#EDF2F7] gap-1.5">
              <FolderPlus className="h-3.5 w-3.5" /> Folder
            </Button>
            <Button variant="outline" size="sm" onClick={() => zipInputRef.current?.click()} className="h-9 rounded-lg border-white/10 bg-[#1B222C] text-[11px] text-[#EDF2F7] gap-1.5">
              <FileArchive className="h-3.5 w-3.5" /> ZIP
            </Button>
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleZipFile(f)
                e.currentTarget.value = ""
              }}
            />
          </div>

          {/* tree */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            <FileTree
              files={files}
              activePath={active?.path ?? null}
              onOpenFile={(f) => {
                selectFile(f)
                setDrawerOpen(false)
              }}
              onDelete={(f) => setDeleteTarget(f)}
              onRename={(f) => {
                setRenameTarget(f)
                setInputValue(f.path)
              }}
            />
          </div>

          <div className="border-t border-white/5 p-3">
            <Button variant="outline" onClick={onExit} className="h-10 w-full rounded-lg border-white/10 bg-[#1B222C] text-sm text-[#EDF2F7] gap-2">
              <LogOut className="h-4 w-4" /> Keluar editor
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ---------- dialogs ---------- */}
      <Dialog open={newFileDialog} onOpenChange={setNewFileDialog}>
        <DialogContent className="max-w-[20rem] border-white/10 bg-[#141920]">
          <DialogHeader>
            <DialogTitle className="text-left text-sm">File baru</DialogTitle>
            <DialogDescription className="text-left text-xs">
              Tulis path lengkap, contoh <span className="font-mono text-[#A6E22E]">lib/pages/home.dart</span> — template isi otomatis.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="lib/pages/home.dart"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 rounded-xl font-mono text-sm border-white/10 bg-[#1B222C] focus-visible:ring-[#A6E22E]"
          />
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setNewFileDialog(false)} className="flex-1 border-white/10 bg-[#1B222C] text-[#EDF2F7]">Batal</Button>
            <Button onClick={() => createEntry(false)} disabled={busy} className="flex-1 bg-[#A6E22E] text-[#0C0F14] hover:bg-[#B7E94A]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent className="max-w-[20rem] border-white/10 bg-[#141920]">
          <DialogHeader>
            <DialogTitle className="text-left text-sm">Folder baru</DialogTitle>
            <DialogDescription className="text-left text-xs">Contoh: <span className="font-mono text-[#A6E22E]">lib/utils</span></DialogDescription>
          </DialogHeader>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="lib/utils"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 rounded-xl font-mono text-sm border-white/10 bg-[#1B222C] focus-visible:ring-[#A6E22E]"
          />
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setNewFolderDialog(false)} className="flex-1 border-white/10 bg-[#1B222C] text-[#EDF2F7]">Batal</Button>
            <Button onClick={() => createEntry(true)} disabled={busy} className="flex-1 bg-[#A6E22E] text-[#0C0F14] hover:bg-[#B7E94A]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!renameTarget} onOpenChange={(o) => !o && setRenameTarget(null)}>
        <DialogContent className="max-w-[20rem] border-white/10 bg-[#141920]">
          <DialogHeader>
            <DialogTitle className="text-left text-sm">Rename file</DialogTitle>
            <DialogDescription className="text-left text-xs break-all">{renameTarget?.path}</DialogDescription>
          </DialogHeader>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="h-11 rounded-xl font-mono text-sm border-white/10 bg-[#1B222C] focus-visible:ring-[#A6E22E]"
          />
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => setRenameTarget(null)} className="flex-1 border-white/10 bg-[#1B222C] text-[#EDF2F7]">Batal</Button>
            <Button onClick={doRename} disabled={busy} className="flex-1 bg-[#A6E22E] text-[#0C0F14] hover:bg-[#B7E94A]">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* import zip confirm */}
      <Dialog open={importDialog} onOpenChange={(o) => { if (!o) setZipEntries(null); setImportDialog(o) }}>
        <DialogContent className="max-w-[22rem] border-white/10 bg-[#141920]">
          <DialogHeader>
            <DialogTitle className="text-left text-sm">Import base ZIP</DialogTitle>
            <DialogDescription className="text-left text-xs">
              {zipEntries ? (
                <>
                  <span className="font-mono text-[#A6E22E]">{zipEntries.length} file</span> terdeteksi dan siap ditulis ke project.
                </>
              ) : (
                "Membaca ZIP"
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setZipMode("merge")}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${zipMode === "merge" ? "border-[#A6E22E]/50 bg-[#A6E22E]/10" : "border-white/10 bg-[#1B222C]"}`}
            >
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${zipMode === "merge" ? "border-[#A6E22E]" : "border-white/20"}`}>
                {zipMode === "merge" && <span className="size-2 rounded-full bg-[#A6E22E]" />}
              </span>
              <span>
                <span className="block text-sm font-medium">Gabung</span>
                <span className="block text-xs text-[#8A94A6]">File ZIP menimpa path yang sama, file lain tetap</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setZipMode("replace")}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left ${zipMode === "replace" ? "border-[#A6E22E]/50 bg-[#A6E22E]/10" : "border-white/10 bg-[#1B222C]"}`}
            >
              <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${zipMode === "replace" ? "border-[#A6E22E]" : "border-white/20"}`}>
                {zipMode === "replace" && <span className="size-2 rounded-full bg-[#A6E22E]" />}
              </span>
              <span>
                <span className="block text-sm font-medium">Ganti semua</span>
                <span className="block text-xs text-[#8A94A6]">Isi project diganti total dengan isi ZIP</span>
              </span>
            </button>
          </div>
          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={() => { setImportDialog(false); setZipEntries(null) }} className="flex-1 border-white/10 bg-[#1B222C] text-[#EDF2F7]">Batal</Button>
            <Button onClick={applyImport} disabled={importing || !zipEntries} className="flex-1 bg-[#A6E22E] text-[#0C0F14] hover:bg-[#B7E94A]">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Terapkan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-[#141920] max-w-[20rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-left text-sm">Hapus {deleteTarget?.isFolder ? "folder" : "file"}?</AlertDialogTitle>
            <AlertDialogDescription className="text-left break-all">
              {deleteTarget?.path}
              {deleteTarget?.isFolder ? " beserta semua isinya" : ""} akan dihapus dari project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 bg-[#1B222C] border-white/10 text-[#EDF2F7]">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                doDelete()
              }}
              disabled={busy}
              className="flex-1 bg-[#F87171] text-[#0C0F14] hover:bg-[#F87171]/90"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* build popup */}
      <BuildSheet
        open={buildSheetOpen}
        buildId={buildId}
        appName={project.name}
        engine={project.engine}
        onClose={() => setBuildSheetOpen(false)}
      />
    </div>
  )
}
