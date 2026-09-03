"use client";

import { useEffect, useRef, useState } from "react";

import type { ChatResponse, ChatError } from "@/lib/types";

import { PropertyCard } from "./PropertyCard";
import { Sources } from "./sources";
import { SuggestedChips } from "./SuggestedChips";
import { FeedbackModal } from "./FeedbackModal";

interface UserMsg {
  role: "user";
  content: string;
}

interface BotMsg {
  role: "bot";
  content: string;
  data?: ChatResponse;
}

type Msg = UserMsg | BotMsg;

const MAX_CHARS = 500;
// Default 5 in production; override for local testing via .env.local
// (NEXT_PUBLIC_MAX_QUESTIONS). Never commit the override.
const MAX_QUESTIONS = Number(process.env.NEXT_PUBLIC_MAX_QUESTIONS) || 5;
const STORAGE_KEY = "estateai-demo-questions";

export function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [usedQuestions, setUsedQuestions] = useState(0);

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);

  const remainingQuestions = Math.max(
    0,
    MAX_QUESTIONS - usedQuestions,
  );

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        count: number;
        resetAt: number;
      };

      if (Date.now() >= parsed.resetAt) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      setUsedQuestions(
        Math.min(parsed.count, MAX_QUESTIONS),
      );
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  function registerQuestion() {
    const nextCount = Math.min(
      usedQuestions + 1,
      MAX_QUESTIONS,
    );

    setUsedQuestions(nextCount);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        count: nextCount,
        resetAt: Date.now() + 24 * 60 * 60 * 1000,
      }),
    );
  }

  async function ask(question: string) {
    const q = question.trim();

    if (!q || loading || remainingQuestions <= 0) {
      return;
    }

    registerQuestion();

    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: q,
      },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: q,
        }),
      });

      if (!res.ok) {
        const error = (await res.json()) as ChatError;

        setMessages((current) => [
          ...current,
          {
            role: "bot",
            content: error.error,
          },
        ]);

        return;
      }

      const data = (await res.json()) as ChatResponse;

      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content: data.answer,
          data,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "bot",
          content:
            "No he podido conectar con el servicio. Inténtalo de nuevo.",
        },
      ]);
    } finally {
      setLoading(false);

      requestAnimationFrame(() => {
        listRef.current?.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }

  if (remainingQuestions === 0) {
    return (
      <>
        <LimitReached
          onFeedback={() => setFeedbackOpen(true)}
        />

        {feedbackOpen && (
          <FeedbackModal
            onClose={() => setFeedbackOpen(false)}
          />
        )}
      </>
    );
  }

  const empty = messages.length === 0;

  return (
    <div className="estate-card overflow-hidden">
      {/* TOP / COUNTER */}
      <div className="relative">
        <div className="absolute right-7 top-7 z-10 flex h-[42px] items-center gap-3 rounded-full bg-accent-weak px-5 text-accent">
          <SparklesIcon />

          <span className="text-[15px] font-semibold">
            {remainingQuestions}/{MAX_QUESTIONS}
          </span>
        </div>

        {/* CHAT AREA */}
        <div
          ref={listRef}
          className="min-h-[445px] max-h-[55vh] overflow-y-auto px-7 pb-8 pt-28 lg:px-14"
        >
          {empty ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
              <div className="flex h-[100px] w-[100px] items-center justify-center rounded-full bg-accent-weak text-accent">
                <LargeChatIcon />
              </div>

              <h2 className="mt-7 text-[25px] font-semibold tracking-[-0.025em] text-text">
                Haz una pregunta para empezar
              </h2>

              <p className="mt-4 max-w-[540px] text-[16px] leading-7 text-text-muted">
                EstateAI responde utilizando únicamente la
                información disponible en las fuentes que tú
                decides.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div
                    key={index}
                    className="flex justify-end"
                  >
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-accent px-5 py-3 text-sm text-white">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div
                    key={index}
                    className="flex justify-start"
                  >
                    <div className="w-full max-w-[92%]">
                      <div className="rounded-2xl border border-border bg-surface-soft px-5 py-4 text-[14px] leading-6">
                        <p className="whitespace-pre-line">
                          {message.content}
                        </p>
                      </div>

                      {message.data &&
                        message.data.properties.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {message.data.properties.map(
                              (property) => (
                                <PropertyCard
                                  key={property.id}
                                  p={property}
                                />
                              ),
                            )}
                          </div>
                        )}

                      {message.data &&
                        message.data.alternatives &&
                        message.data.alternatives.length > 0 && (
                          <div className="mt-4 space-y-3">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                              Opciones parecidas
                            </div>
                            {message.data.alternatives.map(
                              (property) => (
                                <PropertyCard
                                  key={`alt-${property.id}`}
                                  p={property}
                                />
                              ),
                            )}
                          </div>
                        )}

                      {message.data && (
                        <Sources
                          sources={message.data.sources}
                        />
                      )}
                    </div>
                  </div>
                ),
              )}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-border bg-surface-soft px-5 py-4">
                    <Typing />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* CHIPS */}
        {empty && (
          <div className="border-t border-border px-7 py-6 lg:px-14">
            <SuggestedChips
              onPick={ask}
              disabled={loading}
            />
          </div>
        )}

        {/* COMPOSER */}
        <div className="border-t border-border px-7 py-5 lg:px-7">
          <div className="flex items-center gap-3 rounded-[13px] border border-border bg-white p-2">
            <textarea
              value={input}
              onChange={(event) =>
                setInput(
                  event.target.value.slice(
                    0,
                    MAX_CHARS,
                  ),
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey
                ) {
                  event.preventDefault();
                  ask(input);
                }
              }}
              rows={1}
              placeholder="Escribe tu pregunta..."
              className="min-h-[46px] flex-1 resize-none bg-transparent px-3 py-3 text-[14px] text-text outline-none placeholder:text-text-soft"
            />

            {/* ÚNICO BOTÓN DE CONOCIMIENTO */}
            <button
              type="button"
              className="hidden h-[52px] items-center gap-3 rounded-[10px] border border-border px-5 text-[15px] font-medium text-text transition-colors hover:border-accent hover:text-accent sm:flex"
            >
              <DatabaseIcon />
              Conocimiento
            </button>

            {/* SEND */}
            <button
              type="button"
              onClick={() => ask(input)}
              disabled={
                loading ||
                input.trim().length === 0
              }
              aria-label="Enviar pregunta"
              className="flex h-[52px] w-[58px] shrink-0 items-center justify-center rounded-[10px] bg-accent text-white transition-colors hover:bg-accent-dark disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      </div>

      {/* LOCK */}
      <div className="flex items-center justify-center gap-3 px-6 pb-8 pt-1 text-[13px] text-text-muted">
        <LockIcon />

        <span>
          Tus preguntas se reinician en 24 horas.
        </span>
      </div>
    </div>
  );
}

/* ---------------- LIMIT SCREEN ---------------- */

function LimitReached({
  onFeedback,
}: {
  onFeedback: () => void;
}) {
  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_450px]">
      <div className="estate-card px-8 pb-8 pt-20 text-center lg:px-16">
        <div className="flex min-h-[720px] flex-col">
          <div className="flex flex-1 flex-col items-center">
            <div className="flex h-[128px] w-[128px] items-center justify-center rounded-full bg-accent-weak text-accent">
              <LimitChatIcon />
            </div>

            <h2 className="mt-7 text-[28px] font-semibold tracking-[-0.025em]">
              Has usado todas tus preguntas
            </h2>

            <p className="mt-4 max-w-[600px] text-[16px] leading-7 text-text-muted">
              Has llegado al límite de 5 preguntas en esta
              demo.
              <br />
              EstateAI ha respondido usando únicamente la
              información disponible
              <br className="hidden sm:block" />
              en las fuentes que tú decides.
            </p>

            <div className="mt-10 flex max-w-[570px] items-center gap-5 rounded-[11px] border border-accent bg-accent-weak px-6 py-5 text-left">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white text-accent">
                <LockIcon />
              </div>

              <p className="text-[15px] leading-6 text-text-muted">
                En la versión completa tendrás preguntas
                ilimitadas,
                <strong className="block text-accent">
                  más fuentes y funcionalidades avanzadas.
                </strong>
              </p>
            </div>

            <div className="mt-11">
              <h3 className="text-[21px] font-semibold">
                ¿Te gustaría tener EstateAI en tu negocio?
              </h3>

              <p className="mt-2 text-[16px] text-text-muted">
                Hablemos y te enseñamos cómo puede ayudarte.
              </p>

              <div className="mt-7 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/contacto"
                  className="flex h-[56px] min-w-[275px] items-center justify-center gap-3 rounded-[10px] bg-accent px-6 font-semibold text-white transition-colors hover:bg-accent-dark"
                >
                  <CalendarIcon />
                  Agendar una demo
                </a>

                <a
                  href="/contacto"
                  className="flex h-[56px] min-w-[275px] items-center justify-center gap-3 rounded-[10px] border border-accent px-6 font-semibold text-text transition-colors hover:bg-accent-weak"
                >
                  <MailIcon />
                  Enviar mensaje
                </a>
              </div>
            </div>
          </div>

          {/* FEEDBACK */}
          <div className="mt-9 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-center gap-5 text-[14px] text-text-muted">
              <StarIcon />

              <span>
                ¿Te ha resultado útil la demo?
              </span>

              <span>
                Tu feedback nos ayuda a mejorar.
              </span>

              <button
                type="button"
                onClick={onFeedback}
                className="flex h-[43px] w-[43px] items-center justify-center rounded-[9px] border border-border bg-white text-text-muted transition-colors hover:border-accent hover:text-accent"
                aria-label="Me gusta"
              >
                <ThumbUpIcon />
              </button>

              <button
                type="button"
                onClick={onFeedback}
                className="flex h-[43px] w-[43px] items-center justify-center rounded-[9px] border border-border bg-white text-text-muted transition-colors hover:border-accent hover:text-accent"
                aria-label="No me gusta"
              >
                <ThumbDownIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="space-y-5">
        <HasTested />

        <BusinessCard />
      </div>

      <div className="col-span-full flex items-center justify-center gap-3 border-t border-border pt-5 text-[14px] text-text-muted">
        <LockIcon />
        Tus preguntas se reinician en 24 horas.
      </div>
    </div>
  );
}

function HasTested() {
  const items = [
    [
      "property",
      "Consultar propiedades",
      "Información detallada de inmuebles y características.",
    ],
    [
      "location",
      "Explorar barrios y zonas",
      "Descubre áreas, servicios y puntos de interés.",
    ],
    [
      "document",
      "Consultar FAQs",
      "Respuestas a las preguntas más comunes.",
    ],
    [
      "process",
      "Preguntar sobre procesos",
      "Información sobre procesos y operaciones.",
    ],
  ];

  return (
    <section className="estate-card px-8 py-7">
      <h2 className="text-[18px] font-semibold">
        Has probado
      </h2>

      <div className="mt-6 space-y-6">
        {items.map(([icon, title, description]) => (
          <div
            key={title}
            className="flex gap-5"
          >
            <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-accent-weak text-accent">
              <FeatureIcon type={icon} />
            </div>

            <div>
              <p className="text-[16px] font-semibold">
                {title}
              </p>

              <p className="mt-1 text-[14px] leading-7 text-text-muted">
                {description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BusinessCard() {
  return (
    <section className="overflow-hidden rounded-[14px] border border-accent bg-accent-weak">
      <div className="px-7 py-7">
        <div className="flex items-center gap-4">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-white text-accent">
            <SparklesIcon />
          </div>

          <h2 className="text-[18px] font-semibold text-accent-dark">
            EstateAI para tu negocio
          </h2>
        </div>

        <ul className="mt-6 space-y-4">
          {[
            "Preguntas ilimitadas",
            "Más fuentes y datos conectados",
            "Respuestas más precisas",
            "Integraciones a medida",
            "Soporte prioritario",
          ].map((item) => (
            <li
              key={item}
              className="flex items-center gap-4 text-[15px]"
            >
              <span className="text-accent">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <a
        href="/contacto"
        className="mx-5 mb-5 flex h-[51px] items-center justify-center gap-4 rounded-[9px] bg-accent text-[16px] font-semibold text-white transition-colors hover:bg-accent-dark"
      >
        Quiero esto para mi negocio
        <ArrowRight />
      </a>
    </section>
  );
}

/* ---------------- Icons ---------------- */

function ArrowRight() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LargeChatIcon() {
  return (
    <svg
      width="58"
      height="58"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M20 11.5a6.5 6.5 0 0 1-6.5 6.5H9l-5 3v-6.2A6.5 6.5 0 0 1 3 11.5 6.5 6.5 0 0 1 9.5 5h4A6.5 6.5 0 0 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 11.5h.01M12 11.5h.01M16 11.5h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LimitChatIcon() {
  return (
    <svg
      width="68"
      height="68"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M18 4H8a5 5 0 0 0-5 5v6a5 5 0 0 0 5 5h3l3 2v-2h4a5 5 0 0 0 5-5V9a5 5 0 0 0-5-5Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />

      <path
        d="M9 11h.01M13 11h.01"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <circle
        cx="17.5"
        cy="17.5"
        r="4"
        fill="white"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      <path
        d="m16 16 3 3M19 16l-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.5 13.6 9l6.4 1.5-6.4 1.6L12 18.5l-1.6-6.4L4 10.5 10.4 9 12 2.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <ellipse
        cx="12"
        cy="5"
        rx="7"
        ry="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="m22 2-7 20-4-9-9-4 20-7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M22 2 11 13"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 10V7a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 3v4M16 3v4M3 10h18"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m4 7 8 6 8-6"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbUpIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 10v10H4V10h3ZM7 20h8.5a3 3 0 0 0 2.9-2.2l1.5-5.5A2.5 2.5 0 0 0 17.5 9H14l.7-3.1A2.4 2.4 0 0 0 12.4 3L8 9.5H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 14V4H4v10h3ZM7 4h8.5a3 3 0 0 1 2.9 2.2l1.5 5.5a2.5 2.5 0 0 1-2.4 3.3H14l.7 3.1a2.4 2.4 0 0 1-2.3 2.9L8 14.5H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FeatureIcon({
  type,
}: {
  type: string;
}) {
  if (type === "location") {
    return (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <path
          d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="10"
          r="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (type === "document") {
    return (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 3h8l4 4v14H6V3Z"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M14 3v5h4M9 13h6M9 16h4"
          stroke="currentColor"
          strokeWidth="1.7"
        />
      </svg>
    );
  }

  if (type === "process") {
    return (
      <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
        <rect
          x="4"
          y="7"
          width="16"
          height="13"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M9 7V5h6v2M4 12h16"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="m3 11 9-7 9 7M5 9.5V20h14V9.5M9 20v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Typing() {
  return (
    <span className="inline-flex gap-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}