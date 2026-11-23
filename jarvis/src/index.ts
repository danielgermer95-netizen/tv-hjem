// Jarvis – lille Cloudflare-server, der gemmer API-nøglen og taler med Claude.
// Selve handlingerne (åbne apps, tastetryk, beskeder) udføres af mobil-appen,
// som sender resultatet tilbage i næste kald.
import Anthropic from "@anthropic-ai/sdk";

export interface Env {
  ANTHROPIC_API_KEY: string; // sættes med: npx wrangler secret put ANTHROPIC_API_KEY
  JARVIS_KEY: string;        // samme kanal-nøgle som appen bruger
  TMDB_TOKEN?: string;       // valgfri: TMDB "API Read Access Token" til filmopslag
  ELEVENLABS_API_KEY?: string; // valgfri: stemme fra ElevenLabs
  ELEVENLABS_VOICE_ID?: string; // valgfri: hvilken stemme (standard: "Daniel", britisk mand)
  ROOM: DurableObjectNamespace; // beskedcentral mellem mobil og TV
}

// Beskedcentral: mobil og TV holder hver en åben forbindelse, og alt der sendes
// videresendes straks til de andre. Erstatter ntfy.sh (hurtigere og uden fælles grænser).
export class Room {
  state: DurableObjectState;
  constructor(state: DurableObjectState) { this.state = state; }
  async fetch(req: Request): Promise<Response> {
    if (req.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      this.state.acceptWebSocket(pair[1]);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    const msg = await req.text();
    for (const ws of this.state.getWebSockets()) { try { ws.send(msg); } catch (e) { /* lukket */ } }
    return new Response("ok");
  }
  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    if (data === "ping") { ws.send("pong"); return; }
    for (const o of this.state.getWebSockets()) if (o !== ws) { try { o.send(data); } catch (e) { /* lukket */ } }
  }
  async webSocketClose(ws: WebSocket) { try { ws.close(); } catch (e) { /* allerede lukket */ } }
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
Svar kort – typisk én eller to sætninger, for svaret kan blive læst højt. Sproget fremgår af instruktionerne nedenfor (standard: dansk).
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

    // Beskedcentralen: /relay (WebSocket for at lytte, POST for at sende). Nøglen i ?k= eller header.
    const url = new URL(req.url);
    if (url.pathname === "/relay") {
      const key = url.searchParams.get("k") || req.headers.get("X-Jarvis-Key");
      if (!env.JARVIS_KEY || key !== env.JARVIS_KEY) return json({ error: "Ikke tilladt" }, 401, origin);
      const stub = env.ROOM.get(env.ROOM.idFromName("hjem"));
      const r = await stub.fetch(req);
      if (r.status === 101) return r;
      return new Response(await r.text(), { status: r.status, headers: cors(origin) });
    }
    if (req.method !== "POST") return json({ error: "Kun POST" }, 405, origin);

    // Kun familiens app må bruge serveren
    if (!env.JARVIS_KEY || req.headers.get("X-Jarvis-Key") !== env.JARVIS_KEY) {
      return json({ error: "Ikke tilladt" }, 401, origin);
    }

    let body: { messages?: unknown[]; tools?: unknown[]; context?: string; tmdb?: string; tts?: string; fast?: boolean; model?: string };
    try { body = await req.json(); } catch { return json({ error: "Ugyldig JSON" }, 400, origin); }
    // Tale: lav Jarvis' svar om til lyd (mp3) med ElevenLabs
    if (typeof body.tts === "string") {
      if (!env.ELEVENLABS_API_KEY) return json({ error: "ElevenLabs-nøgle mangler på serveren" }, 501, origin);
      const text = body.tts.slice(0, 600);
      const voice = env.ELEVENLABS_VOICE_ID || "onwK4e9ZLuTAKqWW03F9";
      const r = await fetch("https://api.elevenlabs.io/v1/text-to-speech/" + voice + "?output_format=mp3_44100_128", {
        method: "POST",
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json", accept: "audio/mpeg" },
        // "fast": Flash-modellen svarer meget hurtigere (lidt mindre naturlig)
        body: JSON.stringify({ text, model_id: body.fast ? "eleven_flash_v2_5" : "eleven_multilingual_v2", voice_settings: { stability: 0.55, similarity_boost: 0.8 } }),
      });
      if (!r.ok) return json({ error: "ElevenLabs svarede " + r.status }, 502, origin);
      return new Response(r.body, { status: 200, headers: { "Content-Type": "audio/mpeg", ...cors(origin) } });
    }

    // Filmopslag i TMDB (nøglen bliver her på serveren). Kun søgning og streamingtjenester.
    if (typeof body.tmdb === "string") {
      if (!env.TMDB_TOKEN) return json({ error: "TMDB-nøgle mangler på serveren" }, 501, origin);
      const path = body.tmdb;
      if (!/^\/(search\/multi\?[^#]*|(movie|tv)\/\d+\/watch\/providers)$/.test(path)) return json({ error: "Ugyldigt opslag" }, 400, origin);
      const r = await fetch("https://api.themoviedb.org/3" + path, { headers: { Authorization: "Bearer " + env.TMDB_TOKEN, accept: "application/json" } });
      return new Response(await r.text(), { status: r.status, headers: { "Content-Type": "application/json", ...cors(origin) } });
    }

    const messages = body.messages;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 60) {
      return json({ error: "Ugyldige beskeder" }, 400, origin);
    }

    // Appen kan selv sende sine værktøjer og en kort kontekst med, så nye evner
    // ikke kræver, at serveren opdateres
    const tools = Array.isArray(body.tools) && body.tools.length > 0 && body.tools.length <= 20 ? body.tools : TOOLS;
    const system = SYSTEM + (typeof body.context === "string" && body.context ? "\n\n" + body.context.slice(0, 3000) : "");

    // Appen kan vælge model (hurtig eller klog) blandt disse
    const MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5"];
    const model = typeof body.model === "string" && MODELS.includes(body.model) ? body.model : MODEL;

    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    try {
      const params: Record<string, unknown> = {
        model,
        max_tokens: 16000,
        // Lav effort: korte, hurtige svar til en stemmeassistent
        output_config: { effort: "low" },
        system,
        tools,
        messages,
      };
      // Hvis modellen afviser en forespørgsel, prøver API'et selv en anden model
      // (findes ikke til Haiku)
      if (model !== "claude-haiku-5-5") { params.betas = ["server-side-fallback-2026-07-01"]; params.fallbacks = "default"; }
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
