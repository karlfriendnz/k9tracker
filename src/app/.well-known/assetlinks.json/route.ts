// Digital Asset Links — Android's equivalent of Apple App Site Association.
// Tells Android that this domain is verified to be associated with the
// PupManager app, so https://app.pupmanager.com/... links open in the
// installed app instead of the system browser.
//
// Critical requirements:
// - Served at https://app.pupmanager.com/.well-known/assetlinks.json
// - Content-Type: application/json
// - HTTP 200, no redirects
//
// The `sha256_cert_fingerprints` array must include EVERY signing cert
// that signs APKs/AABs we ship — typically two:
//   1. Upload key (the one your CI uses to sign builds before Play
//      handles re-signing).
//   2. Google Play's app-signing key (the one Play uses to sign builds
//      delivered to devices — find it in Play Console → App integrity
//      → App signing → SHA-256 cert fingerprint).
//
// Both are needed because Android verifies against the cert used to sign
// the installed APK. Until both are listed, deep-link verification
// (autoVerify=true in the manifest) will fail and links won't open in
// the app.
//
// TODO: replace placeholders below once you have the fingerprints from
// Play Console + your CI signing config. Until then, Android links will
// still fall back to the browser (which is fine — same as the current
// behaviour).

export const dynamic = 'force-static'

const PACKAGE_NAME = 'com.pupmanager.app'

const fingerprints: string[] = [
  // 'AA:BB:CC:DD:EE:FF:...',  // Upload key SHA-256 — fill in
  // 'AA:BB:CC:DD:EE:FF:...',  // Play-signed key SHA-256 — fill in
]

const assetlinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: fingerprints,
    },
  },
]

export function GET() {
  return new Response(JSON.stringify(assetlinks), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'public, max-age=300',
    },
  })
}
