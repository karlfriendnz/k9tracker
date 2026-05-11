// Apple App Site Association — tells iOS that this domain is associated
// with our app, so HTTPS links to app.pupmanager.com open in the installed
// PupManager app (Capacitor WebView) instead of Safari.
//
// Critical Apple requirements:
// - Served at https://app.pupmanager.com/.well-known/apple-app-site-association
// - Content-Type: application/json (no .json extension allowed on the URL,
//   which is why this is a route handler rather than a static public/ file)
// - HTTP 200, no redirects
// - HTTPS only
//
// iOS caches AASA aggressively on the device. After the first install of an
// app build that claims this domain, the AASA is fetched and remembered;
// subsequent edits here may take a fresh install (or several days) before
// they take effect on existing devices.
//
// AppID format: `TEAMID.BUNDLEID`. The Team ID comes from the Apple Developer
// account; the Bundle ID is configured in Xcode + capacitor.config.ts.
//   Team ID:   7VV3KXA2S5
//   Bundle ID: com.pupmanager.app
//
// The `paths` / `components` array claims the WHOLE domain so every link
// to app.pupmanager.com (web app, magic-link callbacks, share URLs)
// opens in the app when installed. Falls back to Safari when not.

export const dynamic = 'force-static'

const APP_ID = '7VV3KXA2S5.com.pupmanager.app'

const aasa = {
  applinks: {
    details: [
      {
        appIDs: [APP_ID],
        components: [
          { '/': '/*' },
        ],
      },
    ],
  },
  // Reserved for future use — webcredentials lets iOS suggest saved
  // passwords from Keychain on the matching domain. Magic-link clients
  // don't need it but trainer credentials login does, so wiring it now
  // costs nothing.
  webcredentials: {
    apps: [APP_ID],
  },
}

export function GET() {
  return new Response(JSON.stringify(aasa), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      // Don't let CDNs/browsers cache it long — if we ever update which
      // paths get app-routed we want the change to propagate quickly.
      // iOS itself caches the file separately at install time, so this
      // cache header only affects CDN/browser behaviour.
      'cache-control': 'public, max-age=300',
    },
  })
}
