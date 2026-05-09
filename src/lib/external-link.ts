// Open a URL "externally" — outside the app shell. On the web this is just
// a normal navigation; under Capacitor we use `_system` so iOS hands the
// URL to Safari (or the user's default browser) rather than opening it
// inside the WebView. Critical for billing flows: Apple's anti-steering
// rules give B2B SaaS a green light to send subscribers to a web payment
// page, but only if the experience clearly leaves the app — `_system`
// is what makes that explicit.
//
// We don't pull in @capacitor/browser because that plugin requires a
// native iOS rebuild to install, which we want to avoid on every billing
// tweak. window.open with target='_system' is recognised by Capacitor's
// WebView shim out of the box (configured in capacitor.config.ts).
export function openExternal(url: string): void {
  if (typeof window === 'undefined') return
  const anyWindow = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }
  const isNative = !!anyWindow.Capacitor?.isNativePlatform?.()
  if (isNative) {
    // _system is the Capacitor convention for "leave the app, open in the
    // OS's default browser". On iOS this is Safari, on Android Chrome.
    window.open(url, '_system')
    return
  }
  // Web: top-level nav so the user goes to Stripe in the same tab. Stripe
  // bounces them back via success/cancel URLs.
  window.location.href = url
}
