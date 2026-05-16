// Client-safe feature flags (no prisma / server-only imports — safe to
// import from 'use client' components and the server alike).

// Temporary kill-switch for the PUBLIC (embed-form) class self-enrolment
// surface only: the public page, its API, and the package editor's
// "let clients self-enrol" toggle. Trainer-managed classes, roster,
// enrolment and the client view are unaffected. Flip to true to
// re-expose. Hidden 2026-05-16 — the public flow needs rework.
export const PUBLIC_CLASS_ENROLLMENT_ENABLED = false
