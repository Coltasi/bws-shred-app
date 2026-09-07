import Anthropic from "@anthropic-ai/sdk";

/**
 * Coach briefing endpoint.
 *
 * This exists as a server route for one reason: the Anthropic API key must not
 * reach the browser. Anything prefixed NEXT_PUBLIC_ is compiled into the client
 * bundle and readable by anyone who opens devtools, so the key lives only in
 * Vercel's server environment and the phone talks to this route instead.
 *
 * The client sends a digest of already-computed numbers. The model never sees
 * raw logs and never does arithmetic — it interprets and prioritises. That
 * keeps a briefing at roughly 800 input / 200 output tokens, which on Haiku 4.5
 * is about a fifth of a cent.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.COACH_MODEL || "claude-haiku-4-5-20251001";

const SYSTEM = `You are a strength and nutrition coach reading a client's training and body-composition data. You write the short post-workout briefing in their app.

Rules:
- Every number you cite is given to you. Never calculate, never estimate, never invent a figure. If a value is null, say the data isn't there rather than guessing.
- Be direct and specific. No praise padding, no "great job", no exclamation marks. Assume an intelligent adult who wants the truth.
- Say the uncomfortable thing when the data says it: muscle lost, a deficit that isn't real, weeks of no logging.
- One week of weight data is mostly water. Don't over-read short trends, and say so when someone might.
- Muscle mass from bioimpedance includes glycogen and its bound water, so it swings with training and carbs. A drop after a layoff is not all tissue.
- British English. No em-dashes.

Return ONLY minified JSON, no markdown fence, with exactly these keys:
{"headline":string,"lifting":string,"diet":string,"body":string,"nextAction":string}

Lengths: headline under 60 characters, a blunt verdict. lifting/diet/body one or two sentences each, under 220 characters. nextAction one concrete thing to do before or during the next session, under 160 characters.`;

interface Payload { digest?: unknown }

export async function POST(request: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    return Response.json(
      { error: "not-configured", message: "ANTHROPIC_API_KEY is not set on the server." },
      { status: 503 },
    );
  }

  let digest: unknown;
  try {
    const body = (await request.json()) as Payload;
    digest = body?.digest;
  } catch {
    return Response.json({ error: "bad-request", message: "Body must be JSON." }, { status: 400 });
  }
  if (!digest || typeof digest !== "object") {
    return Response.json({ error: "bad-request", message: "Missing digest." }, { status: 400 });
  }

  // Hard cap: a malformed or hostile client shouldn't be able to run up a bill.
  const serialised = JSON.stringify(digest);
  if (serialised.length > 12_000) {
    return Response.json({ error: "too-large", message: "Digest too large." }, { status: 413 });
  }

  try {
    const client = new Anthropic({ apiKey: key });
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      temperature: 0.4,
      system: SYSTEM,
      messages: [{
        role: "user",
        content: `Here is the client's current data. Write the briefing.\n\n${serialised}`,
      }],
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "");

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      return Response.json(
        { error: "bad-model-output", message: "The model did not return usable JSON." },
        { status: 502 },
      );
    }

    const str = (v: unknown, max: number) =>
      typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "";

    const briefing = {
      headline:   str(parsed.headline, 90),
      lifting:    str(parsed.lifting, 300),
      diet:       str(parsed.diet, 300),
      body:       str(parsed.body, 300),
      nextAction: str(parsed.nextAction, 220),
    };

    // If the model dropped a field, fall back rather than render a blank card.
    if (!briefing.headline || !briefing.nextAction) {
      return Response.json(
        { error: "bad-model-output", message: "The model returned an incomplete briefing." },
        { status: 502 },
      );
    }

    return Response.json({
      briefing,
      model: MODEL,
      usage: { input: res.usage.input_tokens, output: res.usage.output_tokens },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    // Never leak the key or full SDK internals to the client.
    return Response.json({ error: "upstream", message: message.slice(0, 200) }, { status: 502 });
  }
}
