# Yadh Hafsi — personal academic website

Static site (plain HTML/CSS, no build step) mirroring the structure of the
Google Site at https://sites.google.com/view/yadh-hafsi/ :
Home (`index.html`), Research, Teaching, Talks, Contact.

## Deploy to GitHub Pages (not yet done — awaiting approval)

1. Create a public repository named `<username>.github.io` (site will live at
   `https://<username>.github.io/`) or any repo name (site at
   `https://<username>.github.io/<repo>/`).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "Personal academic website"
   git remote add origin git@github.com:<username>/<repo>.git
   git push -u origin main
   ```
3. In the repo: Settings → Pages → Source: "Deploy from a branch" →
   Branch `main`, folder `/ (root)` → Save. Live within a minute or two.
4. Optional custom domain: Settings → Pages → Custom domain (add a CNAME/A
   record at your registrar). Then verify the site in Google Search Console
   and request indexing.

## Notes

- Fonts (Newsreader + Inter) load from Google Fonts.
- Photos in `assets/` were taken from the existing Google Site.
- `schema.org` Person markup is embedded in `index.html` for SEO.
