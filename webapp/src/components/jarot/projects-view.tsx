"use client"

// JAROTCOMPILER — Projects page: daftar project + FAB (+) kanan bawah.

import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { MoreVertical, Plus, Cpu, Waves, Loader2, Trash2, FolderOpen, GitBranch, CheckCircle2, XCircle, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { api, timeAgo, type ProjectCard } from "@/lib/jarot/client"
import { toast } from "sonner"

function EngineChip({ engine }: { engine: string }) {
  const flutter = engine === "flutter"
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-[#A6E22E]/30 bg-[#A6E22E]/10 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-[#A6E22E]">
      {flutter ? <Waves className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
      {engine}
    </span>
  )
}

function BuildDot({ status }: { status: string | null }) {
  if (!status) return <span className="font-mono text-[10px] text-[#8A94A6]">belum build</span>
  if (status === "success")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#A6E22E]">
        <CheckCircle2 className="h-3 w-3" /> apk siap
      </span>
    )
  if (status === "failed")
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#F87171]">
        <XCircle className="h-3 w-3" /> build gagal
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-[#EDF2F7]">
      <Clock className="h-3 w-3 animate-pulse" /> building
    </span>
  )
}

export default function ProjectsView({
  onNew,
  onOpen,
}: {
  onNew: () => void
  onOpen: (id: string) => void
}) {
  const [projects, setProjects] = useState<ProjectCard[] | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectCard | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    try {
      setProjects(await api.listProjects())
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal memuat project")
      setProjects([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.deleteProject(deleteTarget.id)
      toast.success(`Project "${deleteTarget.name}" dihapus`)
      setDeleteTarget(null)
      await load()
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal hapus project")
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, load])

  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      {/* top bar */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0C0F14]/95 backdrop-blur px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-[#A6E22E] font-mono text-lg font-bold text-[#0C0F14]">
            »
          </div>
          <div>
            <div className="font-mono text-sm font-semibold tracking-tight leading-none">JAROTCOMPILER</div>
            <div className="font-mono text-[10px] text-[#8A94A6] leading-none mt-1">APK BUILDER</div>
          </div>
        </div>
        <div className="font-mono text-[10px] text-[#8A94A6] flex items-center gap-1">
          <GitBranch className="h-3 w-3" />
          {projects ? `${projects.length} PROJECT` : "MEMUAT"}
        </div>
      </header>

      {/* list */}
      <main className="flex-1 px-4 py-4 space-y-3 pb-28">
        {projects === null && (
          <div className="space-y-3 pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[76px] rounded-xl bg-[#141920] animate-pulse border border-white/5" />
            ))}
          </div>
        )}

        {projects && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-center select-none">
            <svg viewBox="0 0 96 96" className="h-28 w-28 opacity-90" aria-hidden>
              <rect x="8" y="8" width="80" height="80" rx="18" fill="#141920" stroke="#A6E22E" strokeOpacity="0.35" />
              <path d="M34 30 L50 48 L34 66" stroke="#A6E22E" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M50 30 L66 48 L50 66" stroke="#A6E22E" strokeOpacity="0.45" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-6 font-mono text-sm text-[#EDF2F7]">Belum ada project</p>
            <p className="mt-1.5 text-sm text-[#8A94A6] max-w-[240px] leading-relaxed">
              Tekan tombol <span className="text-[#A6E22E] font-semibold">+</span> di bawah kanan untuk bikin APK pertamamu.
            </p>
          </div>
        )}

        {projects?.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.06, 0.3) }}
            className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#141920] p-3 shadow-lg shadow-black/30 active:bg-[#1B222C] transition-colors cursor-pointer"
            onClick={() => onOpen(p.id)}
          >
            {p.icon ? (
              <img src={p.icon} alt={`Icon ${p.name}`} className="size-12 rounded-xl border border-white/10 object-cover shrink-0" />
            ) : (
              <div className="size-12 rounded-xl bg-[#1B222C] shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[15px] font-semibold leading-tight">{p.name}</span>
                <EngineChip engine={p.engine} />
              </div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-[#8A94A6]">{p.packageName}</div>
              <div className="mt-1 flex items-center gap-2 font-mono text-[10px] text-[#8A94A6]">
                <span>{p.fileCount} file</span>
                <span className="text-white/10">|</span>
                <span>{timeAgo(p.updatedAt)}</span>
                <BuildDot status={p.lastBuildStatus} />
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="size-9 shrink-0 text-[#8A94A6] active:bg-white/5" aria-label={`Menu ${p.name}`}>
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="border-white/10 bg-[#141920]">
                <DropdownMenuItem onClick={() => onOpen(p.id)} className="gap-2 text-[#EDF2F7]">
                  <FolderOpen className="h-4 w-4" /> Buka editor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(p)}
                  className="gap-2 text-[#F87171] focus:text-[#F87171]"
                >
                  <Trash2 className="h-4 w-4" /> Hapus project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        ))}
      </main>

      {/* FAB (+) kanan bawah */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[30rem]">
        <div className="pointer-events-auto absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-4">
          {projects && projects.length === 0 && (
            <span className="absolute inset-0 -m-1 rounded-2xl bg-[#A6E22E]/25 animate-ping" aria-hidden />
          )}
          <Button
            onClick={onNew}
            size="icon"
            aria-label="Project baru"
            className="relative size-14 rounded-2xl bg-[#A6E22E] text-[#0C0F14] shadow-xl shadow-black/50 hover:bg-[#B7E94A] active:translate-y-px active:brightness-90 transition"
          >
            <Plus className="size-7" strokeWidth={2.5} />
          </Button>
        </div>
      </div>

      {/* delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="border-white/10 bg-[#141920] max-w-[20rem]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-left">Hapus project?</AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              &quot;{deleteTarget?.name}&quot; beserta semua file &amp; riwayat build-nya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2">
            <AlertDialogCancel className="mt-0 flex-1 bg-[#1B222C] border-white/10 text-[#EDF2F7]">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-[#F87171] text-[#0C0F14] hover:bg-[#F87171]/90"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
