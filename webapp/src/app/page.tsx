"use client"

// JAROTCOMPILER — single visible route.
// Views (projects / config / editor) live client-side, history is synced
// via query params so the phone back button still works.

import { useCallback, useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import ProjectsView from "@/components/jarot/projects-view"
import ConfigView from "@/components/jarot/config-view"
import EditorView from "@/components/jarot/editor-view"

type View = "projects" | "config" | "editor"

function parseLocation(): { view: View; projectId: string | null } {
  if (typeof window === "undefined") return { view: "projects", projectId: null }
  const q = new URLSearchParams(window.location.search)
  const v = q.get("v")
  const p = q.get("p")
  if (v === "editor" && p) return { view: "editor", projectId: p }
  if (v === "config") return { view: "config", projectId: null }
  return { view: "projects", projectId: null }
}

export default function Home() {
  const [state, setState] = useState<{ view: View; projectId: string | null }>({
    view: "projects",
    projectId: null,
  })
  const [projectsKey, setProjectsKey] = useState(0)

  const go = useCallback((view: View, projectId: string | null = null) => {
    setState({ view, projectId })
    const q =
      view === "editor" && projectId
        ? `?v=editor&p=${projectId}`
        : view === "config"
          ? "?v=config"
          : ""
    window.history.pushState({}, "", "/" + q)
  }, [])

  const back = useCallback(() => {
    window.history.back()
  }, [])

  useEffect(() => {
    // deep link disinkronkan setelah mount biar tidak hydration mismatch
    const raf = requestAnimationFrame(() => setState(parseLocation()))
    const onPop = () => setState(parseLocation())
    window.addEventListener("popstate", onPop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("popstate", onPop)
    }
  }, [])

  // editor exit -> refresh the projects list ordering
  const exitEditor = useCallback(() => {
    setProjectsKey((k) => k + 1)
    back()
  }, [back])

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[30rem] flex-col">
      <AnimatePresence mode="wait" initial={false}>
        {state.view === "projects" && (
          <motion.div
            key="projects"
            className="flex min-h-[100dvh] flex-col"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.15 }}
          >
            <ProjectsView key={projectsKey} onNew={() => go("config")} onOpen={(id) => go("editor", id)} />
          </motion.div>
        )}

        {state.view === "config" && (
          <motion.div
            key="config"
            className="flex min-h-[100dvh] flex-col"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.18 }}
          >
            <ConfigView
              onBack={back}
              onCreated={() => {
                setProjectsKey((k) => k + 1)
                go("projects")
              }}
            />
          </motion.div>
        )}

        {state.view === "editor" && state.projectId && (
          <motion.div
            key={`editor-${state.projectId}`}
            className="flex flex-col"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.18 }}
          >
            <EditorView projectId={state.projectId} onExit={exitEditor} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
