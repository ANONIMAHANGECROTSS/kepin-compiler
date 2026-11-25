"use client"

// JAROTCOMPILER — Config page: nama APK, package, engine (< > switcher), icon.

import { useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Waves, Cpu, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api, type Engine } from "@/lib/jarot/client"
import { DEFAULT_ICON_DATA_URL } from "@/lib/jarot/icon"
import { toast } from "sonner"

const ENGINES: { id: Engine; name: string; desc: string; icon: typeof Waves; points: string[] }[] = [
  {
    id: "flutter",
    name: "Flutter",
    desc: "Framework Dart dari Flutter resmi",
    icon: Waves,
    points: ["UI Material 3 langsung dari lib/main.dart", "Toolchain flutter resmi saat build"],
  },
  {
    id: "native",
    name: "Native",
    desc: "Java + Gradle Android asli",
    icon: Cpu,
    points: ["AndroidManifest + MainActivity.java", "Gradle assembleRelease murni"],
  },
]

export default function ConfigView({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [packageName, setPackageName] = useState("com.jarot.app")
  const [engineIdx, setEngineIdx] = useState(0)
  const [icon, setIcon] = useState<string>(DEFAULT_ICON_DATA_URL)
  const [creating, setCreating] = useState(false)
  const [errors, setErrors] = useState<{ name?: string; packageName?: string }>({})
  const iconInputRef = useRef<HTMLInputElement>(null)

  const engine = ENGINES[engineIdx]

  const cycle = (dir: 1 | -1) => {
    setEngineIdx((i) => (i + dir + ENGINES.length) % ENGINES.length)
  }

  const pickIcon = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result)
      const img = new window.Image()
      img.onload = () => {
        // resize ke 192x192 PNG biar icon launcher konsisten
        const canvas = document.createElement("canvas")
        canvas.width = 192
        canvas.height = 192
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        const scale = Math.max(192 / img.width, 192 / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (192 - w) / 2, (192 - h) / 2, w, h)
        setIcon(canvas.toDataURL("image/png"))
        toast.success("Icon APK dipasang")
      }
      img.onerror = () => toast.error("Gambar tidak terbaca, coba file lain")
      img.src = src
    }
    reader.onerror = () => toast.error("Gagal baca file icon")
    reader.readAsDataURL(file)
  }

  const submit = async () => {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = "Nama APK wajib diisi"
    const pkg = packageName.trim().toLowerCase()
    const badSeg = pkg.split(".").find((s) =>
      ["abstract","assert","boolean","break","byte","case","catch","char","class","const","continue",
      "default","do","double","else","enum","extends","final","finally","float","for","goto","if",
      "implements","import","instanceof","int","interface","long","native","new","package","private",
      "protected","public","return","short","static","strictfp","super","switch","synchronized","this",
      "throw","throws","transient","try","void","volatile","while","true","false","null"].includes(s)
    )
    if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(pkg)) {
      errs.packageName = "Format package salah, contoh: com.jarot.app"
    } else if (badSeg) {
      errs.packageName = `"${badSeg}" adalah kata kunci Java, ganti segmen itu`
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setCreating(true)
    try {
      const res = await api.createProject({ name: name.trim(), packageName: pkg, engine: engine.id, icon })
      toast.success(`Project "${name.trim()}" dibuat`)
      onCreated()
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal bikin project")
    } finally {
      setCreating(false)
    }
  }

  const EngineIcon = engine.icon

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-10 border-b border-white/5 bg-[#0C0F14]/95 backdrop-blur h-14 px-2 flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Kembali" className="size-10 text-[#EDF2F7] active:bg-white/5">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="font-mono text-sm font-semibold tracking-tight leading-none">PROJECT BARU</div>
          <div className="font-mono text-[10px] text-[#8A94A6] leading-none mt-1">KONFIGURASI APK</div>
        </div>
        <span className="ml-auto font-mono text-[10px] text-[#8A94A6] pr-2">1 LANGKAH</span>
      </header>

      <main className="flex-1 px-4 py-5 space-y-7 pb-36">
        {/* NAMA APK */}
        <section>
          <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A94A6]">Nama APK</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Misal: Jarot Chat"
            className="mt-2 h-12 rounded-xl border-white/10 bg-[#1B222C] text-base placeholder:text-[#8A94A6]/60 focus-visible:ring-[#A6E22E] focus-visible:ring-offset-0"
          />
          <p className="mt-1.5 text-xs text-[#8A94A6]">Nama yang muncul di launcher HP</p>
          {errors.name && <p className="mt-1 text-xs text-[#F87171]">{errors.name}</p>}
        </section>

        {/* PACKAGE */}
        <section>
          <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A94A6]">Package</label>
          <Input
            value={packageName}
            onChange={(e) => setPackageName(e.target.value.toLowerCase())}
            placeholder="com.jarot.app"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="mt-2 h-12 rounded-xl font-mono text-base border-white/10 bg-[#1B222C] placeholder:text-[#8A94A6]/60 focus-visible:ring-[#A6E22E] focus-visible:ring-offset-0"
          />
          <p className="mt-1.5 text-xs text-[#8A94A6]">Identitas aplikasi, min 2 segmen (huruf kecil + titik)</p>
          {errors.packageName && <p className="mt-1 text-xs text-[#F87171]">{errors.packageName}</p>}
        </section>

        {/* ENGINE < > */}
        <section>
          <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A94A6]">Engine Build</label>
          <div className="mt-2 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => cycle(-1)}
              aria-label="Engine sebelumnya"
              className="size-11 shrink-0 rounded-xl border-white/10 bg-[#141920] text-[#EDF2F7] active:scale-95 transition-transform"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="relative flex-1 min-h-[132px] overflow-hidden rounded-xl border border-[#A6E22E]/25 bg-[#141920]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={engine.id}
                  initial={{ opacity: 0, x: 26 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -26 }}
                  transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  className="p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-11 place-items-center rounded-lg bg-[#A6E22E]/15 text-[#A6E22E]">
                      <EngineIcon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-lg font-semibold tracking-tight leading-none">{engine.name.toUpperCase()}</div>
                      <div className="mt-1 text-xs leading-snug text-[#8A94A6]">{engine.desc}</div>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {engine.points.map((pt) => (
                      <li key={pt} className="flex items-center gap-1.5 text-xs text-[#8A94A6]">
                        <Check className="h-3.5 w-3.5 text-[#A6E22E] shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => cycle(1)}
              aria-label="Engine berikutnya"
              className="size-11 shrink-0 rounded-xl border-white/10 bg-[#141920] text-[#EDF2F7] active:scale-95 transition-transform"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <p className="mt-1.5 text-xs text-[#8A94A6]">Tekan <span className="text-[#EDF2F7]">&lt; &gt;</span> untuk ganti engine</p>
        </section>

        {/* ICON APK */}
        <section>
          <label className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A94A6]">Icon APK</label>
          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => iconInputRef.current?.click()}
              className="grid size-24 place-items-center rounded-2xl border border-dashed border-white/15 bg-[#141920] overflow-hidden active:scale-95 transition-transform"
              aria-label="Pilih icon APK"
            >
              {icon ? (
                <img src={icon} alt="Icon APK terpilih" className="size-full object-cover" />
              ) : (
                <ImagePlus className="h-6 w-6 text-[#8A94A6]" />
              )}
            </button>
            <div className="flex-1 text-sm text-[#8A94A6] leading-relaxed">
              PNG / JPG apa pun, otomatis di-resize jadi launcher icon 192px.
              <br />
              <button type="button" onClick={() => iconInputRef.current?.click()} className="mt-2 text-xs font-medium text-[#A6E22E] underline underline-offset-2">
                Pilih gambar
              </button>
            </div>
            <input
              ref={iconInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) pickIcon(f)
                e.currentTarget.value = ""
              }}
            />
          </div>
        </section>
      </main>

      {/* action bawah */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[30rem] border-t border-white/5 bg-[#0C0F14]/95 backdrop-blur p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button
          onClick={submit}
          disabled={creating}
          className="h-12 w-full rounded-xl bg-[#A6E22E] text-[15px] font-bold text-[#0C0F14] hover:bg-[#B7E94A] active:translate-y-px active:brightness-90"
        >
          {creating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Membuat project
            </>
          ) : (
            "Buat Project"
          )}
        </Button>
      </div>
    </div>
  )
}
