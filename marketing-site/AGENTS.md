# PupManager marketing site — agent + human guide

Public marketing site for PupManager (pupmanager.com). Lives inside the main `pupmanager` monorepo at `marketing-site/`, separate from the app at `app.pupmanager.com` which lives at the repo root.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind 4 (CSS-first theme in `src/app/globals.css`)
- MDX for blog posts — each post is its own folder under `src/app/blog/<slug>/page.mdx` (static routes, not dynamic `[slug]`)
- `@vercel/analytics`, `@vercel/speed-insights`, `@next/third-parties` Google Analytics (`G-QFF3G5WGQ5`)
- Deployed on Vercel — auto-deploys on push to `main` of the parent repo

## Layout

```
marketing-site/
├── src/
│   ├── app/                # routes (App Router)
│   │   ├── layout.tsx      # nav + footer wrap, GA, cookie banner
│   │   ├── page.tsx        # home
│   │   ├── about/page.tsx
│   │   ├── pricing/page.tsx
│   │   ├── pricing/v2/page.tsx
│   │   ├── changelog/page.tsx
│   │   ├── contact/page.tsx (+ actions.ts)
│   │   ├── faq/page.tsx
│   │   ├── features/page.tsx
│   │   ├── features/[category]/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── roadmap/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── blog/page.tsx                                   # index
│   │   ├── blog/duct-tape-stack/page.mdx                   # post
│   │   ├── blog/structured-session-notes/page.mdx          # post
│   │   ├── blog/sunday-night/page.mdx                      # post
│   │   ├── fonts/BalooBhai-Regular.ttf
│   │   ├── opengraph-image.tsx
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   └── globals.css     # Tailwind + brand tokens
│   ├── components/         # Nav, Footer, BlogPostLayout, CookieBanner, ContactForm, etc.
│   └── lib/                # posts.ts (MDX frontmatter), features.ts
├── public/                 # logomark.svg, wordmark.svg, hero/trainer photos, blog/*, app badges
├── assets/                 # source PNGs (logomark variants) — not served
├── next.config.ts
└── package.json            # port 3001
```

## How to add a blog post

1. Create `src/app/blog/<slug>/page.mdx`.
2. Add frontmatter:
   ```mdx
   ---
   title: Post title
   description: One-line summary used on the index and meta tags.
   date: 2026-05-12
   author: Karl
   ---
   ```
3. Write the post. JSX allowed.
4. `src/lib/posts.ts` discovers it automatically. Commit + push to `main` → live.

## How to edit copy

- **Home, pricing, about, features, etc.**: edit the matching `.tsx` file.
- **Voice rules** are non-negotiable. Full customer profile in `../branding/marketing/_context/customer-profile.md`. Short version:
  - Plain-spoken professional. Linear / Cal.com / Superhuman, not Mindbody.
  - Never write "fur baby," "pet parent," "doggo," "tail-wagging," emoji, or movement politics (R+ vs. balanced).
  - Treat the reader like the credentialed working trainer they are.
  - Positioning: **"We give you back Sunday night."**
- Bullseye customer: solo or 2–3 person training-only business owner, 2–7 years in, on a duct-tape stack of Acuity + Stripe + Google Sheets.

## Brand assets

- `public/logomark.svg` — standalone P-with-dog mark
- `public/wordmark.svg` / `public/wordmark.png` — horizontal logomark + wordmark
- `public/hero-bg.png`, `public/hero-illustration.png`, `public/dog-at-laptop.png`, `public/trainer-*.{jpg,png}` — page hero art
- `public/blog/<slug>-vN.png` — blog hero images, **version the filename** when swapping (see image rule below)
- `public/app-store-badge.svg`, `public/google-play-badge.svg` — app store badges
- Brand teal sampled from app icon, scale in `src/app/globals.css` under `@theme`

## next/image swaps — rename, don't overwrite

When replacing any image referenced by `next/image`, bump the filename suffix (`foo.png` → `foo-v2.png`) and update the `src=` in the same edit. **Don't overwrite in place** — Next.js's image optimizer keeps serving the stale optimized bytes from the same `/_next/image?url=...` URL, and clearing `.next/cache/images` isn't enough.

## Local dev

```
cd marketing-site
npm install
npm run dev      # http://localhost:3001
npm run build
npm run lint
```

## Deployment

- Vercel project: `pupmanager-marketing-site` (under `karlfriendnzs-projects`)
- Watches `karlfriendnz/pupmanager` on `main`, **Root Directory: `marketing-site/`**
- Push to `main` → auto-deploy to pupmanager.com
- PRs → preview URL in checks
- DNS: `pupmanager.com` (apex A → 76.76.21.21) and `www` (CNAME → cname.vercel-dns.com, 308 → apex) at Namecheap

## When making changes

- Prefer editing existing files over creating new ones.
- No fabricated testimonials, names, or quotes.
- Don't add a CMS, headless service, or new dep without asking — content-in-git is the maintenance promise.
- For UI changes, run `npm run dev` and look at the page in a browser before reporting done.
- **Never `git push`** without the literal phrase "Deploy Live" from Karl.
