import { NextRequest, NextResponse } from "next/server";
import { answerQuestion } from "@/lib/rag";
import { checkRateLimit } from "@/lib/ratelimit";
import { MAX_INPUT_CHARS } from "@/lib/config";
import type { ChatError } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function err(code: ChatError["code"], message: string, status: number) {
  return NextResponse.json<ChatError>({ error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("bad_request", "Cuerpo de la petición no válido.", 400);
  }

  const message = (body as { message?: unknown })?.message;
  if (typeof message !== "string" || message.trim().length === 0) {
    return err("bad_request", "Escribe una pregunta.", 400);
  }
  if (message.length > MAX_INPUT_CHARS) {
    return err("input_too_long", `La pregunta supera el máximo de ${MAX_INPUT_CHARS} caracteres.`, 413);
  }

  const rl = checkRateLimit(clientIp(req));
  if (!rl.ok) {
    if (rl.reason === "rate_limit_global") {
      return err("rate_limit_global", "Se ha alcanzado el límite de uso de la demo por hoy. Contáctame para una prueba con tus datos.", 429);
    }
    return err("rate_limit_ip", "Has hecho muchas preguntas seguidas. Espera un momento e inténtalo de nuevo.", 429);
  }

  try {
    const result = await answerQuestion(message.trim());
    return NextResponse.json(result);
  } catch (e) {
    console.error("[/api/chat]", e);
    return err("server_error", "Algo ha fallado procesando la pregunta. Inténtalo de nuevo.", 500);
  }
}
