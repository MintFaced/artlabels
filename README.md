# THE LINE — Gallery Label Generator

Minimal web app to batch-create gallery labels and export as print-ready A3 PDFs.

## Local Development

```bash
npm install
npm run dev
```

## Deploy to Railway

1. Push to GitHub
2. Connect repo in Railway
3. Railway will auto-detect the Dockerfile
4. Set up custom domain via Cloudflare

## Stack

- Vite + React 18
- Tailwind CSS
- jsPDF for PDF generation
- Static site (no backend)
