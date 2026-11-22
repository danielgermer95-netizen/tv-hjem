# Jarvis – server

Lille Cloudflare Worker, der gemmer Anthropic-nøglen og taler med Claude for TV Hjem-appen.
Handlingerne (åbne apps, tastetryk, beskeder) udføres af mobil-appen.

## Installér (fra Mac'en, ca. 5 min)

```bash
cd jarvis
npm install
npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put JARVIS_KEY
npx wrangler deploy
```

- `ANTHROPIC_API_KEY`: nøglen fra console.anthropic.com
- `JARVIS_KEY`: samme kanal-nøgle som appen bruger (står i dit personlige link efter `#k=`)
- `deploy` skriver serverens adresse (…workers.dev). Indsæt den i appen under **Jarvis → Server**.
