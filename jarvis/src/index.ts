// Jarvis – lille Cloudflare-server, der gemmer API-nøglen og taler med Claude.
// Selve handlingerne (åbne apps, tastetryk, beskeder) udføres af mobil-appen,
// som sender resultatet tilbage i næste kald.
import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string; // sættes med: npx wrangler secret put ANTHROPIC_API_KEY
  JARVIS_KEY: string;        // samme kanal-nøgle som appen bruger
}

const MODEL = "claude-opus-5-5";

const APPS = ["drtv", "tv2play", "netflix", "hbomax", "prime", "disney", "viaplay",
  "skyshow", "appletv", "youtube", "spotify", "playstation", "hjem"] as const;

const KEYS = ["KEY_VOLUP", "KEY_VOLDOWN", "KEY_MUTE", "KEY_CHUP", "KEY_CHDOWN",
  "KEY_UP", "KEY_DOWN", "KEY_LEFT", "KEY_RIGHT", "KEY_ENTER", "KEY_RETURN",
  "KEY_HOME", "KEY_MENU", "KEY_SOURCE", "KEY_PLAY_BACK", "KEY_POWER",
  "KEY_0", "KEY_1", "KEY_2", "KEY_3", "KEY_4", "KEY_5", "KEY_6", "KEY_7", "KEY_8", "KEY_9"] as const;

// Værktøjer som mobil-appen udfører
const TOOLS: Anthropic.Tool[] = [
  {
    name: "open_app",
    description: "Åbner en app på stue-TV'et (Samsung). 'hjem' er familiens egen startskærm med vejr og beskeder. 'playstation' skifter til PS5 på HDMI.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { app: { type: "string", enum: [...APPS] } },
      required: ["app"],
      additionalProperties: false,
    },
  },
  {
    name: "press_keys",
    description: "Sender tastetryk til TV'et som fra fjernbetjeningen. Gentag en tast for flere trin, fx 5 × KEY_VOLUP for at skrue 5 trin op. KEY_POWER slukker TV'et.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { keys: { type: "array", items: { type: "string", enum: [...KEYS] } } },
      required: ["keys"],
      additionalProperties: false,
    },
  },
  {
    name: "send_tv_message",
    description: "Viser en kort tekstbesked i beskedfeltet på TV'ets Hjem-skærm.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
      additionalProperties: false,
    },
  },
];

const SYSTEM = `Du er Jarvis, familiens assistent til stue-TV'et (Samsung Q60D) i Aarhus.
Du svarer altid på dansk, kort og venligt – typisk én eller to sætninger, for svaret kan blive læst højt.
Brug værktøjerne til at styre TV'et, når brugeren beder om det. Sig kort, hvad du har gjort.
Hvis en handling fejler, så sig det ærligt og foreslå, hvad brugeren kan gøre.
Du kan ikke tænde et slukket TV – bed i så fald brugeren tænde det.`;

function cors(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Jarvis-Key",
    "Access-Control-Max-Age": "86400",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors(origin) },
  });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get("Origin");
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    if (req.method !== "POST") return json({ error: "Kun POST" }, 405, origin);

    // Kun familiens app må bruge serveren
    if (!env.JARVIS_KEY || req.headers.get("X-Jarvis-Key") !== env.JARVIS_KEY) {
      return json({ error: "Ikke tilladt" }, 401, origin);
    }

    let body: { messages?: unknown[] };
    try { body = await req.json(); } catch { return json({ error: "Ugyldig JSON" }, 400, origin); }
    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      return json({ error: "Ugyldige beskeder" }, 400, origin);
    }

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const params = {
        model: MODEL,
        max_tokens: 16000,
        // Lav effort: korte, hurtige svar til en stemmeassistent
        output_config: { effort: "low" },
        // Hvis modellen afviser en forespørgsel, prøver API'et selv en anden model
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: SYSTEM,
        tools: TOOLS,
        messages,
      };
      // "fallbacks" er nyere end nogle SDK-typer, derfor cast
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = await client.beta.messages.create(params as any);
      return json({ content: msg.content, stop_reason: msg.stop_reason }, 200, origin);
    } catch (err) {
      if (err instanceof Anthropic.RateLimitError) return json({ error: "For mange forespørgsler – prøv igen om lidt" }, 429, origin);
      if (err instanceof Anthropic.AuthenticationError) return json({ error: "API-nøglen virker ikke" }, 500, origin);
      if (err instanceof Anthropic.APIError) return json({ error: "Claude svarede med en fejl (" + err.status + ")" }, 502, origin);
      return json({ error: "Kunne ikke kontakte Claude" }, 502, origin);
    }
  },
};
