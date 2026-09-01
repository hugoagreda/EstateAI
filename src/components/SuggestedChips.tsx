const SUGGESTED = [
  {
    text: "¿Tenéis pisos en Chamberí?",
    icon: "house",
  },
  {
    text: "Viviendas con terraza",
    icon: "terrace",
  },
  {
    text: "¿Hay plazas de garaje?",
    icon: "car",
  },
  {
    text: "Pisos de menos de 600.000 €",
    icon: "euro",
  },
  {
    text: "¿Qué son las arras?",
    icon: "document",
  },
  {
    text: "¿Cómo es Malasaña?",
    icon: "location",
  },
] as const;

export function SuggestedChips({
  onPick,
  disabled,
}: {
  onPick: (question: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {SUGGESTED.map((item) => (
        <button
          key={item.text}
          type="button"
          onClick={() => onPick(item.text)}
          disabled={disabled}
          className="flex h-[64px] items-center gap-4 rounded-[11px] border border-border bg-white px-5 text-left transition-colors hover:border-accent hover:bg-accent-weak disabled:pointer-events-none disabled:opacity-50"
        >
          <span className="shrink-0 text-accent">
            <ChipIcon type={item.icon} />
          </span>

          <span className="text-[15px] font-medium text-text">
            {item.text}
          </span>
        </button>
      ))}
    </div>
  );
}

function ChipIcon({
  type,
}: {
  type: string;
}) {
  if (type === "house") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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

  if (type === "terrace") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 20V10M19 20V10M5 14h14M9 10V7a3 3 0 0 1 6 0v3M3 20h18"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle
          cx="8"
          cy="9"
          r="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (type === "car") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="m5 11 1.8-5h10.4L19 11M4 11h16v7H4v-7Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M7 18v2M17 18v2M6 14h.01M18 14h.01"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "euro") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <path
          d="M15 8.5c-.7-.6-1.6-.9-2.6-.9-2.2 0-3.7 1.8-3.7 4.4s1.5 4.4 3.7 4.4c1 0 1.9-.3 2.6-.9M7.5 11h5M7.5 13h5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === "document") {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 3h8l4 4v14H6V3Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M14 3v5h4M9 13h6M9 16h4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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