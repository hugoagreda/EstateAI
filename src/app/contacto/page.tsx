import Link from "next/link";
import { Header, Footer } from "@/components/Layout";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-[1480px] px-6 py-2 lg:px-7">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          {/* LEFT */}
          <section className="estate-card px-8 py-10 lg:px-12 lg:py-11">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-weak px-4 py-2 text-[13px] font-semibold text-accent">
              <MailIcon />
              Hablemos
            </div>

            <h1 className="mt-6 max-w-[600px] text-[30px] font-semibold leading-tight tracking-[-0.025em]">
              ¿Tienes alguna pregunta o quieres{" "}
              <span className="text-accent">
                EstateAI
              </span>{" "}
              para tu negocio?
            </h1>

            <p className="mt-4 max-w-[570px] text-[16px] leading-7 text-text-muted">
              Estamos aquí para ayudarte. Escríbenos y te
              responderemos lo antes posible.
            </p>

            <div className="mt-9 space-y-3">
              <ContactItem
                icon={<MailIcon large />}
                title="Email"
                value="hola@estateai.dev"
              />

              <ContactItem
                icon={<WhatsAppIcon />}
                title="WhatsApp"
                value="+34 623 456 789"
              />

              <ContactItem
                icon={<LinkedInIcon />}
                title="LinkedIn"
                value="Hugo Ágreda"
              />

              <ContactItem
                icon={<CalendarIcon />}
                title="Agendar una demo"
                value="Elige un hueco en mi calendario"
              />
            </div>

            <div className="mt-9 flex gap-4 rounded-[11px] bg-accent-weak px-5 py-5">
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-white text-accent">
                <ShieldIcon />
              </div>

              <div>
                <p className="font-semibold">
                  Privacidad y seguridad
                </p>

                <p className="mt-1 text-[13px] leading-6 text-text-muted">
                  Tus datos están protegidos. No compartimos
                  tu información con terceros.
                </p>
              </div>
            </div>
          </section>

          {/* RIGHT */}
          <section className="estate-card px-8 py-10 lg:px-12 lg:py-11">
            <h2 className="text-[21px] font-semibold">
              Envíanos un mensaje
            </h2>

            <form className="mt-7 space-y-6">
              <Field
                label="Nombre"
                placeholder="Tu nombre"
              />

              <Field
                label="Email"
                placeholder="tu@email.com"
                type="email"
              />

              <Field
                label="Empresa (opcional)"
                placeholder="Nombre de tu empresa"
              />

              <div>
                <label className="text-[14px] font-semibold">
                  Mensaje
                </label>

                <div className="relative mt-2">
                  <textarea
                    maxLength={1000}
                    rows={6}
                    placeholder="Cuéntanos cómo podemos ayudarte..."
                    className="w-full resize-none rounded-[10px] border border-border px-4 py-4 text-[14px] outline-none placeholder:text-text-soft focus:border-accent"
                  />

                  <span className="absolute bottom-3 right-4 text-[11px] text-text-muted">
                    0/1000
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[12px] text-text-muted">
                <LockIcon />

                Responderemos lo antes posible,
                normalmente en menos de 24h.
              </div>

              <button
                type="submit"
                className="flex h-[54px] w-full items-center justify-center gap-3 rounded-[9px] bg-accent text-[16px] font-semibold text-white transition-colors hover:bg-accent-dark"
              >
                <SendIcon />
                Enviar mensaje
              </button>
            </form>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

function ContactItem({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[84px] items-center gap-5 rounded-[11px] border border-border px-5">
      <div className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full bg-accent-weak text-accent">
        {icon}
      </div>

      <div className="flex-1">
        <p className="text-[15px] font-semibold">
          {title}
        </p>

        <p className="mt-1 text-[14px] text-accent">
          {value}
        </p>
      </div>

      <span className="text-[25px] text-text">›</span>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = "text",
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[14px] font-semibold">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 h-[50px] w-full rounded-[10px] border border-border px-4 text-[14px] outline-none placeholder:text-text-soft focus:border-accent"
      />
    </div>
  );
}

/* Icons */

function MailIcon({
  large = false,
}: {
  large?: boolean;
}) {
  return (
    <svg
      width={large ? 25 : 16}
      height={large ? 25 : 16}
      viewBox="0 0 24 24"
      fill="none"
    >
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

function WhatsAppIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4.1A8 8 0 1 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M9 9c.3-.5.5-.5.8-.5.2 0 .4 0 .6.5l.7 1.5c.1.3.1.5-.1.7l-.5.6c.5 1 1.2 1.7 2.2 2.2l.6-.5c.2-.2.4-.2.7-.1l1.5.7c.5.2.5.4.5.6 0 .3 0 .5-.5.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8 10v6M8 7.5v.01M12 16v-3.2a2.8 2.8 0 0 1 5.6 0V16M12 10v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
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

function ShieldIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12 2.2 2.2 4.8-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
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

function SendIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
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