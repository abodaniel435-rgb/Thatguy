# Publish CurrenSee

CurrenSee can be published today as a polished front-end product preview, prototype, or sales demo. A true commercial launch still requires a backend for secure authentication, email reset flows, server-side sessions, stored alerts, and protected API keys.

## What this project is right now

- A front-end product demo suitable for portfolio use, investor demos, or client previews
- A polished static deployment candidate for Netlify, Vercel, or GitHub Pages
- Not yet a full production SaaS with backend infrastructure

## Fastest option: Netlify

1. Create a GitHub repository and upload this project.
2. Sign in to Netlify and choose **Add new site** -> **Import an existing project**.
3. Select the repository.
4. Leave the build command empty.
5. Set the publish directory to `.`.
6. Deploy the site.

Netlify will give you a public URL like:

`https://your-site-name.netlify.app`

## Before presenting it publicly

1. Replace placeholder company emails and legal copy with your real business details.
2. Update `site.webmanifest`, `sitemap.xml`, and any brand references with your production domain.
3. Review the help, privacy, pricing, and terms pages so they match your actual business model.
4. Test all pages in desktop and mobile layouts.

## Before charging customers

You should still complete these backend items first:

1. Move authentication and password reset to a secure backend
2. Store users, alerts, and history in a real database
3. Hide API keys behind server-side routes
4. Add real notification delivery for alerts
5. Finalize hosted privacy, billing, and terms documentation

## Make it searchable on Google

1. Open [Google Search Console](https://search.google.com/search-console/about).
2. Add your website domain.
3. Verify ownership.
4. Submit your sitemap:

`https://your-domain.com/sitemap.xml`

Search engines may take some time before your site appears in results.
