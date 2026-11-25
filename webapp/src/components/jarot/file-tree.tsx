"use client"

// JAROTCOMPILER — file tree untuk drawer editor (folder collapsible + aksi per file).

import { useMemo, useState } from "react"
import { ChevronRight, Folder, FolderOpen, Trash2, Pencil, FileCode2, FileText, FileJson2, FileCog, FileImage } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FileMeta } from "@/lib/jarot/client"

type Node = {
  name: string
  path: string
  isFolder: boolean
  meta?: FileMeta
  children: Node[]
}

function buildTree(files: FileMeta[]): Node[] {
  const root: Node = { name: "", path: "", isFolder: true, children: [] }
  for (const f of files) {
    const parts = f.path.split("/")
    let cur = root
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1
      const path = parts.slice(0, i + 1).join("/")
      let next = cur.children.find((c) => c.path === path && (isLast ? c.isFolder === f.isFolder : true))
      if (!next) {
        next = { name: part, path, isFolder: isLast ? f.isFolder : true, meta: isLast ? f : undefined, children: [] }
        cur.children.push(next)
      }
      cur = next
    })
  }
  const sort = (nodes: Node[]): Node[] => {
    nodes.sort((a, b) => {
      if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    nodes.forEach((n) => sort(n.children))
    return nodes
  }
  return sort(root.children)
}

function renderFileIcon(name: string, className: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? ""
  if (["dart", "java", "kt", "js", "ts"].includes(ext))
    return <FileCode2 className={className} />
  if (["json"].includes(ext)) return <FileJson2 className={className} />
  if (["gradle", "properties", "xml", "yaml", "yml"].includes(ext))
    return <FileCog className={className} />
  if (["png", "jpg", "jpeg", "webp", "gif", "ico"].includes(ext))
    return <FileImage className={className} />
  return <FileText className={className} />
}

export function FileTree({
  files,
  activePath,
  onOpenFile,
  onDelete,
  onRename,
}: {
  files: FileMeta[]
  activePath: string | null
  onOpenFile: (f: FileMeta) => void
  onDelete: (f: FileMeta) => void
  onRename: (f: FileMeta) => void
}) {
  const tree = useMemo(() => buildTree(files), [files])
  return <TreeNodes nodes={tree} depth={0} activePath={activePath} onOpenFile={onOpenFile} onDelete={onDelete} onRename={onRename} />
}

function TreeNodes({
  nodes,
  depth,
  activePath,
  onOpenFile,
  onDelete,
  onRename,
}: {
  nodes: Node[]
  depth: number
  activePath: string | null
  onOpenFile: (f: FileMeta) => void
  onDelete: (f: FileMeta) => void
  onRename: (f: FileMeta) => void
}) {
  return (
    <ul className="select-none">
      {nodes.map((node) => (
        <TreeRow
          key={`${node.path}-${node.isFolder}`}
          node={node}
          depth={depth}
          activePath={activePath}
          onOpenFile={onOpenFile}
          onDelete={onDelete}
          onRename={onRename}
        />
      ))}
    </ul>
  )
}

function TreeRow({
  node,
  depth,
  activePath,
  onOpenFile,
  onDelete,
  onRename,
}: {
  node: Node
  depth: number
  activePath: string | null
  onOpenFile: (f: FileMeta) => void
  onDelete: (f: FileMeta) => void
  onRename: (f: FileMeta) => void
}) {
  const [open, setOpen] = useState(true)

  if (node.isFolder) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-10 w-full items-center gap-1 rounded-lg px-1 text-left active:bg-white/5"
          style={{ paddingLeft: depth * 14 + 4 }}
          aria-expanded={open}
        >
          <ChevronRight className={`h-3.5 w-3.5 text-[#8A94A6] transition-transform ${open ? "rotate-90" : ""}`} />
          {open ? (
            <FolderOpen className="h-4 w-4 shrink-0 text-[#A6E22E]" />
          ) : (
            <Folder className="h-4 w-4 shrink-0 text-[#A6E22E]" />
          )}
          <span className="truncate text-sm text-[#EDF2F7]">{node.name}</span>
          <span className="ml-auto shrink-0 font-mono text-[10px] text-[#8A94A6] pr-2">
            {node.children.filter((c) => !c.isFolder).length}
          </span>
        </button>
        {open && node.children.length > 0 && (
          <TreeNodes nodes={node.children} depth={depth + 1} activePath={activePath} onOpenFile={onOpenFile} onDelete={onDelete} onRename={onRename} />
        )}
        {open && node.children.length === 0 && (
          <div className="py-1 font-mono text-[10px] text-[#8A94A6]/60" style={{ paddingLeft: (depth + 1) * 14 + 22 }}>
            (kosong)
          </div>
        )}
      </li>
    )
  }

  const active = activePath === node.path
  const iconClass = `h-4 w-4 shrink-0 ${active ? "text-[#A6E22E]" : "text-[#8A94A6]"}`
  return (
    <li
      className={`group flex items-center gap-1.5 rounded-lg pr-1 ${active ? "bg-[#1B222C] shadow-[inset_2px_0_0_0_#A6E22E]" : "active:bg-white/5"}`}
      style={{ paddingLeft: depth * 14 + 4 }}
    >
      <button
        type="button"
        onClick={() => node.meta && onOpenFile(node.meta)}
        className="flex h-10 min-w-0 flex-1 items-center gap-1.5 text-left"
      >
        {renderFileIcon(node.name, iconClass)}
        <span className={`truncate text-sm ${active ? "text-[#EDF2F7] font-medium" : "text-[#EDF2F7]/90"}`}>{node.name}</span>
      </button>
      {node.meta && (
        <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-[#8A94A6] hover:text-[#EDF2F7] active:bg-white/5"
            aria-label={`Rename ${node.name}`}
            onClick={() => onRename(node.meta!)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-[#8A94A6] hover:text-[#F87171] active:bg-white/5"
            aria-label={`Hapus ${node.name}`}
            onClick={() => onDelete(node.meta!)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </li>
  )
}
