import Link from "next/link";

interface DataSourcesProps {
  zonas: string[];
  counts: {
    pisos: number;
    barrios: number;
    faqs: number;
  };
}

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white-fr ColdGray-200 border-b border-gray-300">
      <div className="mx-auto flex h-[100px] max-w-[1480px] items-center justify-between px-6 lg:px-7">
        {/* LOGO */}
        <Link
          href="/"
          className="flex items-center gap-3"
          aria-label="EstateAI"
        >
          <EstateLogo />

          <span className="text-[38px] font-semibold tracking-[-0.045em] text-text">
            Estate<span className="text-accent">AI</span>
          </span>
        </Link>

        {/* NAV */}
        <nav className="hidden items-center gap-14 md:flex">
          <Link
            href="/"
            className="relative flex h-[100px] items-center text-[17px] font-semibold text-accent"
          >
            Demo

            <span className="absolute bottom-[16px] left-0 right-0 mx-auto h-[3px] w-[45px] rounded-full bg-accent" />
          </Link>

          <Link
            href="/contacto"
            className="flex h-[100px] items-center text-[17px] font-medium text-text hover:text-accent"
          >
            Contacto
          </Link>
        </nav>

        {/* CTA */}
        <Link
          href="/"
          className="flex h-[52px] items-center gap-4 rounded-[10px] border border-accent px-5 text-[16px] font-semibold text-text transition-colors hover:bg-accent hover:text-white"
        >
          Empezar
          <ArrowRight />
        </Link>
      </div>
    </header>
  );
}

export function HowItWorks() {
  const steps = [
    {
      title: "Conecta tus datos",
      description: "Tú decides qué fuentes quieres que use EstateAI.",
      icon: <DatabaseIcon />,
    },
    {
      title: "Indexamos la información",
      description:
        "Procesamos y organizamos tus datos para búsquedas inteligentes.",
      icon: <DocumentIcon />,
    },
    {
      title: "El cliente pregunta",
      description:
        "El visitante hace preguntas en lenguaje natural.",
      icon: <ChatSmallIcon />,
    },
    {
      title: "EstateAI responde",
      description:
        "Responde usando únicamente la información disponible en tus datos.",
      icon: <SparklesIcon />,
    },
  ];

  return (
    <section className="estate-card px-8 py-7">
      <h2 className="text-[17px] font-semibold text-text">
        ¿Cómo funciona EstateAI?
      </h2>

      <div className="relative mt-7">
        {/* vertical line */}
        <div className="absolute left-[18px] top-[25px] bottom-[25px] w-[3px] rounded-full bg-accent-soft" />

        <div className="space-y-7">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="relative flex gap-5"
            >
              {/* number */}
              <div className="relative z-10 flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-accent-weak text-[17px] font-semibold text-accent">
                {index + 1}
              </div>

              {/* icon */}
              <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-accent-weak text-accent">
                {step.icon}
              </div>

              <div className="pt-[2px]">
                <p className="text-[16px] font-semibold text-text">
                  {step.title}
                </p>

                <p className="mt-2 max-w-[245px] text-[14px] leading-7 text-text-muted">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DataSources({
  zonas,
}: DataSourcesProps) {
  const sources = [
    {
      name: "Catálogo de propiedades",
      icon: <HouseIcon />,
    },
    {
      name: "FAQs",
      icon: <DocumentIcon />,
    },
    {
      name: "Barrios y zonas",
      icon: <LocationIcon />,
    },
    {
      name: "Proceso y operaciones",
      icon: <BriefcaseIcon />,
    },
  ];

  return (
    <section className="estate-card overflow-hidden">
      <div className="px-8 py-7">
        <h2 className="text-[17px] font-semibold text-text">
          Fuentes disponibles en esta demo
        </h2>

        <div className="mt-5 space-y-3">
          {sources.map((source) => (
            <div
              key={source.name}
              className="flex items-center gap-4"
            >
              <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-accent-weak text-accent">
                {source.icon}
              </div>

              <span className="text-[15px] text-text">
                {source.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-8 py-5">
        <div className="flex gap-4">
          <div className="mt-0.5 text-accent">
            <LockIcon />
          </div>

          <p className="text-[13px] leading-6 text-text-muted">
            Solo se usan las fuentes habilitadas en esta demo.
            <br />
            Tú decides qué información conectar.
          </p>
        </div>
      </div>
    </section>
  );
}

export function Footer({
  centered = false,
}: {
  centered?: boolean;
}) {
  return (
    <footer className="border-t border-border">
      <div
        className={`mx-auto flex max-w-[1480px] items-center px-6 py-5 lg:px-7 ${
          centered ? "justify-center" : "justify-start"
        }`}
      >
        <Link
          href="https://hugoagreda.dev"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 text-[14px] text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft />
          Volver a hugoagreda.dev
        </Link>
      </div>
    </footer>
  );
}

/* ---------------- Icons ---------------- */

function EstateLogo() {
  return (
    <svg
      width="48"
      height="55"
      viewBox="0 0 48 55"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M24 2 4 14v26l20 13 20-13V14L24 2Z"
        stroke="currentColor"
        strokeWidth="3"
        className="text-accent"
      />

      <path
        d="M16 28.5 24 22l8 6.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      />

      <path
        d="M18 29v8h12v-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="text-accent"
      />

      <circle
        cx="24"
        cy="34"
        r="1.8"
        fill="currentColor"
        className="text-accent"
      />
    </svg>
  );
}

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

function ArrowLeft() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
      <path
        d="M19 12H5M11 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <ellipse
        cx="12"
        cy="5"
        rx="7"
        ry="3"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M7 3h7l4 4v14H7V3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v5h4M10 12h5M10 16h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChatSmallIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M20 11.5a6.5 6.5 0 0 1-6.5 6.5H9l-5 3v-6.2A6.5 6.5 0 0 1 3 11.5 6.5 6.5 0 0 1 9.5 5h4A6.5 6.5 0 0 1 20 11.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
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

function SparklesIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="m19 16 .6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HouseIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
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

function LocationIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
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

function BriefcaseIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
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

function LockIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
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