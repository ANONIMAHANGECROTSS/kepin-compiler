"use client"

// JAROTCOMPILER — popup build: progress bar + langkah ber-icon, poll status
// GitHub Actions, lalu tombol unduh APK.

import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, CloudUpload, Cpu, ExternalLink, FolderGit2, Package, X, XCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { api, type BuildInfo } from "@/lib/jarot/client"
import { toast } from "sonner"

type StepState = "pending" | "active" | "done" | "failed"

export default function BuildSheet({
  open,
  buildId,
  appName,
  engine,
  onClose,
}: {
  open: boolean
  buildId: string | null
  appName: string
  engine: string
  onClose: () => void
}) {
  const [info, setInfo] = useState<BuildInfo | null>(null)
  const [progress, setProgress] = useState(4)

  const done = info?.status === "success" || info?.status === "failed"
  const running = open && !!buildId && !done

  // poll status build
  useEffect(() => {
    if (!open || !buildId || done) return
    let alive = true
    const tick = async () => {
      try {
        const data = await api.getBuild(buildId)
        if (!alive) return
        setInfo((prev) => {
          if (prev && (prev.status === "success" || prev.status === "failed")) return prev
          if (data.status === "success" && prev?.status !== "success") {
            toast.success("APK siap diunduh")
          }
          if (data.status === "failed" && prev?.status !== "failed") {
            toast.error("Build gagal, cek log di GitHub")
          }
          return data
        })
      } catch {
        // biarkan polling lanjut
      }
    }
    tick()
    const id = setInterval(tick, 4000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [open, buildId, done])

  // progress "alive" selama build jalan
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setProgress((p) => (p < 88 ? p + 1.2 : p)), 700)
    return () => clearInterval(id)
  }, [running])

  const displayProgress = useMemo(() => {
    if (!info) return progress
    if (info.status === "success") return 100
    if (info.status === "failed") return 62
    return progress
  }, [info, progress])

  const steps = useMemo(() => {
    const status = info?.status ?? "queued"
    let s0: StepState = "pending"
    let s1: StepState = "pending"
    let s2: StepState = "pending"
    let s3: StepState = "pending"
    if (status === "uploading") {
      s0 = "active"
    } else if (status === "building") {
      s0 = "done"
      s1 = "done"
      s2 = "active"
    } else if (status === "success") {
      s0 = "done"
      s1 = "done"
      s2 = "done"
      s3 = "done"
    } else if (status === "failed") {
      s0 = "done"
      s1 = "done"
      s2 = "failed"
    }
    return [
      { label: "Kirim kode ke GitHub", icon: CloudUpload, state: s0 },
      { label: "GitHub Actions jalan", icon: FolderGit2, state: s1 },
      { label: `Compile engine ${engine}`, icon: Cpu, state: s2 },
      { label: "Paket APK siap", icon: Package, state: s3 },
    ]
  }, [info?.status, engine])

  if (!open) return null

  const failed = info?.status === "failed"
  const success = info?.status === "success"

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative max-h-[92dvh] w-full max-w-[30rem] overflow-y-auto rounded-t-2xl border border-white/10 bg-[#141920] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/60 sm:rounded-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup dialog build"
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-lg text-[#8A94A6] active:bg-white/5"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="font-mono text-sm font-semibold tracking-tight">
          {success ? "APK SIAP" : failed ? "BUILD GAGAL" : "MEMBANGUN APK"}
        </h2>
        <p className="mt-1 truncate text-xs text-[#8A94A6]">
          {appName} · engine {engine} · via GitHub Actions
        </p>

        {/* progress bar */}
        <div className="mt-4 overflow-hidden rounded-lg bg-[#1B222C]">
          <div className="relative h-2.5">
            <div
              className={`h-full transition-all duration-700 ${failed ? "bg-[#F87171]" : "bg-[#A6E22E]"} ${running ? "animate-pulse" : ""}`}
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        </div>
        {!info && (
          <p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] text-[#8A94A6]">
            <Loader2 className="h-3 w-3 animate-spin" /> menyiapkan upload
          </p>
        )}

        {/* langkah */}
        <ul className="mt-4 space-y-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <li key={step.label} className="flex items-center gap-3">
                <div
                  className={`grid size-8 shrink-0 place-items-center rounded-lg border ${
                    step.state === "done"
                      ? "border-[#A6E22E]/40 bg-[#A6E22E]/10 text-[#A6E22E]"
                      : step.state === "active"
                        ? "animate-pulse border-[#A6E22E]/40 bg-[#A6E22E]/10 text-[#A6E22E]"
                        : step.state === "failed"
                          ? "border-[#F87171]/40 bg-[#F87171]/10 text-[#F87171]"
                          : "border-white/10 bg-[#1B222C] text-[#8A94A6]"
                  }`}
                >
                  {step.state === "done" ? <Check className="h-4 w-4" /> : step.state === "failed" ? <XCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-sm ${step.state === "pending" ? "text-[#8A94A6]" : "text-[#EDF2F7]"}`}>{step.label}</span>
                {step.state === "active" && <span className="ml-auto font-mono text-[10px] text-[#A6E22E]">running</span>}
                {step.state === "done" && <span className="ml-auto font-mono text-[10px] text-[#A6E22E]">ok</span>}
              </li>
            )
          })}
        </ul>

        {/* hasil */}
        {success && (
          <Button
            asChild
            className="mt-5 h-12 w-full rounded-xl bg-[#A6E22E] text-[15px] font-bold text-[#0C0F14] hover:bg-[#B7E94A] active:translate-y-px"
          >
            <a href={`/api/builds/${buildId}/download`} download>
              <Package className="h-5 w-5" /> Unduh APK
            </a>
          </Button>
        )}

        {failed && (
          <div className="mt-5 space-y-3">
            <p className="rounded-lg border border-[#F87171]/25 bg-[#F87171]/10 p-3 text-xs leading-relaxed text-[#F87171]">
              {info?.message ?? "Build gagal di GitHub Actions."}
            </p>
            {info?.runUrl && (
              <Button asChild variant="outline" className="h-11 w-full rounded-xl border-white/10 bg-[#1B222C] text-[#EDF2F7]">
                <a href={info.runUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> Lihat log di GitHub
                </a>
              </Button>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between font-mono text-[10px] text-[#8A94A6]">
          <span>{running ? "build berjalan — popup boleh ditutup" : "status final"}</span>
          {info?.runUrl && (
            <a href={info.runUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              run #{info.id.slice(0, 8)}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
