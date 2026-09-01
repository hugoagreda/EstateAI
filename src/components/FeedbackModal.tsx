"use client";

import { useState } from "react";

export function FeedbackModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [liked, setLiked] = useState<"yes" | "no" | null>(
    null,
  );

  const [message, setMessage] = useState("");

  function submit() {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-5 backdrop-blur-[5px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="w-full max-w-[510px] rounded-[14px] bg-white p-8 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-accent-weak text-accent">
              <ChatIcon />
            </div>

            <div>
              <h2
                id="feedback-title"
                className="text-[18px] font-semibold"
              >
                Feedback rápido
              </h2>

              <p className="mt-1 text-[14px] text-text-muted">
                Tu opinión nos ayuda a mejorar EstateAI.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-text-muted transition-colors hover:text-text"
            aria-label="Cerrar"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="my-6 h-px bg-border" />

        <label className="text-[14px] font-semibold">
          ¿Te ha gustado la demo?
        </label>

        <div className="mt-3 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setLiked("yes")}
            className={`flex h-[47px] items-center justify-center gap-3 rounded-[8px] border transition-colors ${
              liked === "yes"
                ? "border-accent bg-accent-weak text-accent"
                : "border-border text-text"
            }`}
          >
            <ThumbUp />
            Sí
          </button>

          <button
            type="button"
            onClick={() => setLiked("no")}
            className={`flex h-[47px] items-center justify-center gap-3 rounded-[8px] border transition-colors ${
              liked === "no"
                ? "border-accent bg-accent-weak text-accent"
                : "border-border text-text"
            }`}
          >
            <ThumbDown />
            No
          </button>
        </div>

        <label className="mt-6 block text-[13px] font-semibold">
          ¿Quieres contarnos por qué? (opcional)
        </label>

        <div className="relative mt-3">
          <textarea
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value.slice(0, 300),
              )
            }
            maxLength={300}
            rows={4}
            placeholder="Cuéntanos brevemente qué te ha parecido..."
            className="w-full resize-none rounded-[9px] border border-border px-4 py-3 text-[14px] outline-none placeholder:text-text-soft focus:border-accent"
          />

          <span className="absolute bottom-3 right-4 text-[11px] text-text-muted">
            {message.length}/300
          </span>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-[14px] font-medium text-text-muted hover:text-text"
          >
            Omitir
          </button>

          <button
            type="button"
            onClick={submit}
            className="h-[43px] rounded-[8px] bg-accent px-6 text-[14px] font-semibold text-white transition-colors hover:bg-accent-dark"
          >
            Enviar opinión
          </button>
        </div>
      </div>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 11.5a6.5 6.5 0 0 1-6.5 6.5H9l-5 3v-6.2A6.5 6.5 0 0 1 3 11.5 6.5 6.5 0 0 1 9.5 5h4A6.5 6.5 0 0 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
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

function CloseIcon() {
  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThumbUp() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 10v10H4V10h3ZM7 20h8.5a3 3 0 0 0 2.9-2.2l1.5-5.5A2.5 2.5 0 0 0 17.5 9H14l.7-3.1A2.4 2.4 0 0 0 12.4 3L8 9.5H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDown() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 14V4H4v10h3ZM7 4h8.5a3 3 0 0 1 2.9 2.2l1.5 5.5a2.5 2.5 0 0 1-2.4 3.3H14l.7 3.1a2.4 2.4 0 0 1-2.3 2.9L8 14.5H7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}