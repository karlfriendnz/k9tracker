'use client'

import { useState } from 'react'
import { Play, ImageIcon, Video } from 'lucide-react'

export interface ReportAttachment {
  id: string
  kind: 'IMAGE' | 'VIDEO'
  url: string
  thumbnailUrl: string | null
  caption: string | null
  durationMs: number | null
}

export function ReportAttachmentsGallery({ attachments }: { attachments: ReportAttachment[] }) {
  if (attachments.length === 0) return null
  return (
    <div className="flex flex-col gap-3">
      {attachments.map(a => (
        <ReportAttachmentTile key={a.id} attachment={a} />
      ))}
    </div>
  )
}

// Read-only mirror of the trainer-facing AttachmentTile — same visual
// language (square crop, video play overlay, duration pill, lightbox)
// but no delete affordance, no caption editor.
function ReportAttachmentTile({ attachment: a }: { attachment: ReportAttachment }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100 group focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {a.kind === 'IMAGE' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.url} alt={a.caption ?? 'Photo'} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <>
            {a.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.thumbnailUrl} alt={a.caption ?? 'Video'} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              // No saved thumbnail (older uploads, or thumbnail-generation
              // failed at upload time). Mount the video itself with
              // preload="metadata" so the browser pulls its own poster
              // frame — the #t=0.1 hash nudges Safari into actually
              // painting a frame instead of the default black box.
              <video
                src={`${a.url}#t=0.1`}
                muted
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover bg-slate-900"
              />
            )}
            <div className="absolute inset-0 grid place-items-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="grid place-items-center h-10 w-10 rounded-full bg-white/85 text-slate-900">
                <Play className="h-5 w-5" />
              </div>
            </div>
            {a.durationMs !== null && a.durationMs > 0 && (
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[10px] font-medium tabular-nums">
                {formatDuration(a.durationMs)}
              </span>
            )}
          </>
        )}
        {a.kind === 'IMAGE' && (
          <div className="absolute top-1 left-1 grid place-items-center h-5 w-5 rounded bg-black/30">
            <ImageIcon className="h-3 w-3 text-white" />
          </div>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute -top-2 -right-2 grid place-items-center h-8 w-8 rounded-full bg-white text-slate-900 shadow-lg z-10"
              aria-label="Close"
            >
              ×
            </button>
            {a.kind === 'IMAGE' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt={a.caption ?? 'Photo'} className="max-h-[85vh] w-full object-contain rounded-xl" />
            ) : (
              <video src={a.url} controls playsInline autoPlay className="max-h-[85vh] w-full rounded-xl bg-black" />
            )}
            {a.caption && (
              <p className="mt-3 text-sm text-white/80 text-center px-4">{a.caption}</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
