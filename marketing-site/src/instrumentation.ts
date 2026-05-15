// Monorepo guard — exists only so Turbopack doesn't walk up to the main
// app's src/instrumentation.ts (which imports @/lib/env, not in this
// project's tsconfig paths). The marketing site has no instrumentation
// needs at present.
export async function register() {
  // intentionally empty
}
