import { readLatestBriefing, LATEST_KEY } from "../lib/storage";

export const dynamic = "force-dynamic";

type AnyObj = Record<string, any>;

type NewsItem = {
  headline: string;
  summary?: string;
  url?: string;
  source?: string;
  tag?: string;
};

type NewsletterItem = {
  subject: string;
  sender?: string;
  summary?: string;
  url?: string;
  receivedAt?: string;
};

type CalendarItem = {
  when?: string;
  tag?: string;
  details?: string;
};

type Balances = {
  asOf?: string;
  savings?: number;
  checking?: number;
  hsa?: number;
  retirementTotal?: number;
};

type StorageFolder = {
  name: string;
  path?: string;
  bytes: number;
};

type StorageVitals = {
  generatedAt?: string;
  root?: {
    mount?: string;
    filesystem?: string;
    totalBytes?: number;
    usedBytes?: number;
    freeBytes?: number;
    percentUsed?: number;
  };
  documents?: {
    path?: string;
    bytes?: number;
  };
  topFolders?: StorageFolder[];
};

function asNumber(x: unknown): number | null {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x !== "string") return null;
  const raw = x.trim();
  if (!raw) return null;

  const negative = raw.startsWith("(") && raw.endsWith(")");
  const cleaned = raw
    .replace(/[$,]/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, "");

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

const USD_FMT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function formatUsd(x: number | null | undefined): string {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  return USD_FMT.format(x);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatBytes(bytes: number | null | undefined): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) return "—";

  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  let v = bytes;

  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }

  const digits = i <= 1 ? 0 : v >= 100 ? 0 : v >= 10 ? 1 : 2;
  return `${v.toFixed(digits)} ${units[i]}`;
}

function asText(x: unknown): string | null {
  if (typeof x === "string") return x;
  if (Array.isArray(x) && x.every((v) => typeof v === "string")) return x.join(" ");
  return null;
}

function normalizeNews(brief: AnyObj | null): NewsItem[] {
  const fi = brief?.fieldIntelligence ?? brief?.field_intelligence ?? brief?.news;
  const items =
    (Array.isArray(fi) ? fi : Array.isArray(fi?.items) ? fi.items : []) as any[];

  return items
    .map((it) => {
      if (typeof it === "string") return { headline: it };
      if (!it || typeof it !== "object") return null;
      return {
        headline:
          it.headline ?? it.title ?? it.text ?? it.name ?? "(untitled headline)",
        summary:
          asText(
            it.summary ??
              it.dek ??
              it.blurb ??
              it.description ??
              it.snippet ??
              it.abstract,
          ) ?? undefined,
        url: it.url ?? it.link,
        source: it.source ?? it.outlet,
        tag: it.tag,
      } satisfies NewsItem;
    })
    .filter(Boolean) as NewsItem[];
}

function normalizeNewsletters(brief: AnyObj | null): NewsletterItem[] {
  const raw =
    brief?.newsletters ??
    brief?.newsletterDigest ??
    brief?.newsletter_digest ??
    brief?.newsletterHighlights ??
    brief?.newsletter_highlights ??
    null;

  const items =
    (Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.items)
        ? raw.items
        : []) as any[];

  return items
    .map((it) => {
      if (typeof it === "string") return { subject: it } satisfies NewsletterItem;
      if (!it || typeof it !== "object") return null;
      return {
        subject:
          it.subject ?? it.title ?? it.headline ?? it.name ?? "(no subject)",
        sender: asText(it.sender ?? it.from ?? it.author ?? it.source) ?? undefined,
        summary:
          asText(
            it.summary ??
              it.snippet ??
              it.blurb ??
              it.description ??
              it.abstract,
          ) ?? undefined,
        url: it.url ?? it.link,
        receivedAt:
          asText(it.receivedAt ?? it.received_at ?? it.date ?? it.when) ??
          undefined,
      } satisfies NewsletterItem;
    })
    .filter(Boolean) as NewsletterItem[];
}

function normalizeCalendar(brief: AnyObj | null): {
  today: CalendarItem[];
  tomorrow: CalendarItem[];
} {
  const mo = brief?.missionOutlook ?? brief?.mission_outlook ?? brief?.calendar;

  const today =
    (Array.isArray(mo?.today)
      ? mo.today
      : Array.isArray(mo)
        ? mo
        : []) as any[];

  const tomorrow = (Array.isArray(mo?.tomorrow) ? mo.tomorrow : []) as any[];

  const norm = (arr: any[]) =>
    arr
      .map((it) => {
        if (typeof it === "string") {
          const [tag, ...rest] = it.split("|");
          return {
            tag: rest.length ? tag.trim() : undefined,
            details: rest.length ? rest.join("|").trim() : it,
          } satisfies CalendarItem;
        }
        if (!it || typeof it !== "object") return null;
        return {
          when: it.when ?? it.time ?? it.start,
          tag: it.tag,
          details: it.details ?? it.summary ?? it.title,
        } satisfies CalendarItem;
      })
      .filter(Boolean) as CalendarItem[];

  return { today: norm(today), tomorrow: norm(tomorrow) };
}

function normalizeBalances(brief: AnyObj | null): Balances | null {
  const raw =
    brief?.balances ?? brief?.accountBalances ?? brief?.account_balances ?? null;

  if (!raw || typeof raw !== "object") return null;
  const b = raw as AnyObj;

  const asOf = asText(b.asOf ?? b.as_of) ?? undefined;
  const savings = asNumber(b.savings ?? b.Savings) ?? undefined;
  const checking = asNumber(b.checking ?? b.Checking) ?? undefined;
  const hsa = asNumber(b.hsa ?? b.HSA) ?? undefined;
  const retirementTotal =
    asNumber(
      b.retirementTotal ??
        b.retirement_total ??
        b.retirementTotalUsd ??
        b.retirement_total_usd ??
        b.retirement,
    ) ?? undefined;

  if (
    typeof savings === "undefined" &&
    typeof checking === "undefined" &&
    typeof hsa === "undefined" &&
    typeof retirementTotal === "undefined"
  ) {
    return null;
  }

  return { asOf, savings, checking, hsa, retirementTotal };
}

function normalizeStorage(brief: AnyObj | null): StorageVitals | null {
  const raw =
    brief?.storage ??
    brief?.storageVitals ??
    brief?.storage_vitals ??
    brief?.storage_vital ??
    null;

  if (!raw || typeof raw !== "object") return null;
  const s = raw as AnyObj;

  const generatedAt = asText(s.generatedAt ?? s.generated_at) ?? undefined;

  const rootRaw =
    (s.root && typeof s.root === "object" ? s.root : null) ??
    (s.rootDisk && typeof s.rootDisk === "object" ? s.rootDisk : null) ??
    (s.root_disk && typeof s.root_disk === "object" ? s.root_disk : null) ??
    null;

  const rootObj = (rootRaw ?? {}) as AnyObj;

  const totalBytes =
    asNumber(
      rootObj.totalBytes ??
        rootObj.total_bytes ??
        rootObj.total ??
        rootObj.sizeBytes ??
        rootObj.size_bytes,
    ) ?? undefined;

  const usedBytes =
    asNumber(rootObj.usedBytes ?? rootObj.used_bytes ?? rootObj.used) ?? undefined;

  const freeBytes =
    asNumber(
      rootObj.freeBytes ??
        rootObj.free_bytes ??
        rootObj.availBytes ??
        rootObj.availableBytes ??
        rootObj.available_bytes ??
        rootObj.free,
    ) ?? undefined;

  const percentUsed =
    asNumber(
      rootObj.percentUsed ??
        rootObj.percent_used ??
        rootObj.capacityPercent ??
        rootObj.capacity_percent,
    ) ??
    (typeof rootObj.capacity === "string"
      ? asNumber(rootObj.capacity.replace(/%$/, ""))
      : asNumber(rootObj.capacity)) ??
    undefined;

  const rootMount = asText(rootObj.mount ?? rootObj.mountedOn ?? rootObj.mounted_on) ?? undefined;
  const filesystem = asText(rootObj.filesystem ?? rootObj.fs) ?? undefined;

  const docsRaw =
    (s.documents && typeof s.documents === "object" ? s.documents : null) ??
    (s.docs && typeof s.docs === "object" ? s.docs : null) ??
    null;

  const docs = docsRaw as AnyObj | null;
  const documentsPath = docs ? asText(docs.path) ?? undefined : undefined;
  const documentsBytes = docs ? asNumber(docs.bytes ?? docs.sizeBytes ?? docs.size_bytes) ?? undefined : undefined;

  const topRaw =
    (Array.isArray(s.topFolders)
      ? s.topFolders
      : Array.isArray(s.top_folders)
        ? s.top_folders
        : []) as any[];

  const topFolders: StorageFolder[] = topRaw
    .map((it) => {
      if (!it || typeof it !== "object") return null;
      const o = it as AnyObj;
      const name = asText(o.name ?? o.folder ?? o.label) ?? null;
      const bytes = asNumber(o.bytes ?? o.sizeBytes ?? o.size_bytes ?? o.size) ?? null;
      if (!name || typeof bytes !== "number") return null;
      return { name, path: asText(o.path) ?? undefined, bytes };
    })
    .filter(Boolean) as StorageFolder[];

  const hasRoot =
    typeof totalBytes === "number" || typeof usedBytes === "number" || typeof freeBytes === "number";

  const hasDocs = typeof documentsBytes === "number";

  const hasTop = topFolders.length > 0;

  if (!hasRoot && !hasDocs && !hasTop) return null;

  return {
    generatedAt,
    root: hasRoot
      ? {
          mount: rootMount,
          filesystem,
          totalBytes,
          usedBytes,
          freeBytes,
          percentUsed,
        }
      : undefined,
    documents: hasDocs || documentsPath ? { path: documentsPath, bytes: documentsBytes } : undefined,
    topFolders: hasTop ? topFolders : undefined,
  };
}

type DonutSegment = { label: string; value: number; color: string };

function DonutChart({
  segments,
  size = 168,
  thickness = 18,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((sum, s) => sum + (Number.isFinite(s.value) ? s.value : 0), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Storage usage">
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="transparent"
          stroke="rgb(241 245 249)"
          strokeWidth={thickness}
        />
        {segments.map((s) => {
          const frac = total > 0 ? s.value / total : 0;
          const dash = clamp(frac, 0, 1) * c;
          const dashArray = `${dash} ${c - dash}`;
          const dashOffset = -offset;
          offset += dash;
          return (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="transparent"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>
    </svg>
  );
}

function StorageSection({ storage }: { storage: StorageVitals | null }) {
  const root = storage?.root;
  const total =
    typeof root?.totalBytes === "number"
      ? root.totalBytes
      : typeof root?.usedBytes === "number" && typeof root?.freeBytes === "number"
        ? root.usedBytes + root.freeBytes
        : null;

  const used =
    typeof root?.usedBytes === "number"
      ? root.usedBytes
      : typeof total === "number" && typeof root?.freeBytes === "number"
        ? total - root.freeBytes
        : null;

  const free =
    typeof root?.freeBytes === "number"
      ? root.freeBytes
      : typeof total === "number" && typeof used === "number"
        ? total - used
        : null;

  if (typeof total !== "number" || total <= 0 || typeof used !== "number" || typeof free !== "number") {
    return (
      <div className="text-sm text-[color:var(--muted-ink)]">
        Add <span className="font-mono">storage</span> (root total/used/free) to the briefing JSON.
      </div>
    );
  }

  const docs = typeof storage?.documents?.bytes === "number" ? storage.documents.bytes : null;
  const docsUsed = docs && docs > 0 ? Math.min(docs, used) : 0;
  const otherUsed = Math.max(used - docsUsed, 0);
  const reserved = Math.max(total - used - free, 0);

  const segments: DonutSegment[] = [
    ...(docsUsed > 0
      ? [{ label: "Documents", value: docsUsed, color: "rgb(51 65 85)" }]
      : []),
    { label: "Other used", value: otherUsed, color: "rgb(15 23 42)" },
    ...(reserved > 0
      ? [{ label: "Reserved/purgeable", value: reserved, color: "rgb(203 213 225)" }]
      : []),
    { label: "Available", value: Math.max(free, 0), color: "rgb(226 232 240)" },
  ];

  const percentUsed =
    typeof root?.percentUsed === "number"
      ? root.percentUsed
      : total > 0
        ? (used / total) * 100
        : 0;

  const top = storage?.topFolders ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        <div className="shrink-0">
          <DonutChart segments={segments} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--muted-ink)]">
            Root disk
          </div>
          <div className="font-display mt-1 text-2xl border-b border-[color:var(--rule)] pb-1">
            {Math.round(percentUsed)}% used
          </div>
          <div className="mt-2 text-xs text-[color:var(--muted-ink)]">
            {formatBytes(used)} used · {formatBytes(free)} available · {formatBytes(total)} total
            {reserved > 0 ? <span> · {formatBytes(reserved)} purgeable</span> : null}
          </div>
          {docsUsed > 0 ? (
            <div className="mt-3 text-xs text-[color:var(--muted-ink)]">
              Documents: <span className="font-mono">{formatBytes(docsUsed)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {top.length ? (
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--muted-ink)] border-b border-[color:var(--rule)] pb-1">
            Top folders in Documents
          </div>
          <ul className="space-y-2 text-xs">
            {top.slice(0, 8).map((f) => (
              <li key={f.path ?? f.name} className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-mono">{f.name}</span>
                <span className="shrink-0 text-[color:var(--muted-ink)]">{formatBytes(f.bytes)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[color:var(--rule)] pt-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-tight">{title}</h2>
        {kicker ? (
          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
            {kicker}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MetricsSection({ metrics }: { metrics: AnyObj | null }) {
  if (!metrics) {
    return (
      <div className="text-sm text-[color:var(--muted-ink)]">
        Add <span className="font-mono">intelligenceMetrics</span> to the briefing JSON.
      </div>
    );
  }

  const volume = metrics.telegram_volume as Record<string, number> | undefined;
  const maxVol = volume ? Math.max(...Object.values(volume), 1) : 0;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">
        {Object.entries(metrics).map(([key, val]) => {
          if (key === "telegram_volume") return null;
          return (
            <div key={key} className="relative">
              <div className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--muted-ink)]">
                {key.replace(/_/g, " ")}
              </div>
              <div className="font-display mt-1 text-2xl border-b border-[color:var(--rule)] pb-1">
                {String(val)}
              </div>
            </div>
          );
        })}
      </div>

      {volume ? (
        <div className="pt-2">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--muted-ink)] border-b border-[color:var(--rule)] pb-1">
            7-Day Digital Pulse
          </div>
          <div className="space-y-3">
            {Object.entries(volume).map(([day, count]) => (
              <div key={day} className="group flex items-center gap-3">
                <div className="w-8 text-[10px] font-medium uppercase text-[color:var(--muted-ink)]">
                  {day}
                </div>
                <div className="relative h-3 flex-1 bg-slate-50 border border-slate-100/50">
                  <div
                    className="absolute inset-y-0 left-0 bg-slate-900 transition-all duration-500"
                    style={{ width: `${(count / maxVol) * 100}%` }}
                  />
                </div>
                <div className="w-8 text-right text-[10px] font-mono text-slate-900">
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default async function Page() {
  const stored = await readLatestBriefing().catch(() => null);
  const brief = (stored?.data ?? null) as AnyObj | null;

  const executiveSummary =
    asText(brief?.executiveSummary) ??
    asText(brief?.executive_summary) ??
    asText(brief?.summary) ??
    null;

  const weather = brief?.weather ?? brief?.local;
  const weatherNarrative = asText(weather?.narrative) ?? asText(weather?.summary);
  const hi = weather?.high ?? weather?.hi;
  const lo = weather?.low ?? weather?.lo;

  const news = normalizeNews(brief);
  const newsletters = normalizeNewsletters(brief);
  const cal = normalizeCalendar(brief);

  const projects =
    (Array.isArray(brief?.projectPulse)
      ? brief.projectPulse
      : Array.isArray(brief?.projects)
        ? brief.projects
        : []) as any[];

  const metrics = brief?.intelligenceMetrics ?? brief?.metrics;
  const balances = normalizeBalances(brief);
  const storage = normalizeStorage(brief);

  const updatedAt = stored?.storedAt ? new Date(stored.storedAt) : null;
  const today = new Date();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <header className="border-b border-[color:var(--rule)] pb-6 text-center">
          <div className="text-[11px] uppercase tracking-[0.25em] text-[color:var(--muted-ink)]">
            Executive Dashboard
          </div>
          <h1 className="font-display mt-3 text-5xl leading-none tracking-tight md:text-7xl">
            The Morning Edition
          </h1>
          <div className="mt-6 flex flex-col items-center justify-center gap-2 border-t border-[color:var(--rule)] pt-4 md:flex-row md:gap-8">
            <div className="text-sm uppercase tracking-[0.2em] text-[color:var(--muted-ink)]">
              {today.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </div>
            <div className="hidden h-1 w-1 rounded-full bg-[color:var(--rule)] md:block" />
            <div className="text-xs italic text-[color:var(--muted-ink)]">
              {updatedAt
                ? `Updated ${updatedAt.toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}`
                : "No briefing loaded yet"}
            </div>
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <Section title="Top Briefing" kicker="2-sentence synthesis">
              <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-6 text-center">
                {executiveSummary ? (
                  <p className="mx-auto max-w-3xl text-lg leading-relaxed italic">
                    "{executiveSummary}"
                  </p>
                ) : (
                  <p className="text-[15px] leading-7 text-[color:var(--muted-ink)]">
                    Waiting on the first briefing payload.
                  </p>
                )}
              </div>
            </Section>
          </div>

          <div className="lg:col-span-8">
            <Section title="Field Intelligence" kicker="AI / Tech news">
              {news.length ? (
                <ul className="space-y-4">
                  {news.slice(0, 12).map((item, idx) => (
                    <li key={idx} className="border-b border-[color:var(--rule)] pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[15px] leading-6">
                            {item.url ? (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline decoration-black/20 underline-offset-4 hover:decoration-black/40"
                              >
                                {item.headline}
                              </a>
                            ) : (
                              <span>{item.headline}</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--muted-ink)]">
                            {item.source ? item.source : ""}
                            {item.tag ? ` · ${item.tag}` : ""}
                          </div>
                          {item.summary ? (
                            <p className="mt-2 text-[13px] leading-6 text-[color:var(--muted-ink)]">
                              {item.summary}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5 text-sm text-[color:var(--muted-ink)]">
                  No headlines yet.
                </div>
              )}
            </Section>
          </div>

          <div className="lg:col-span-4">
            <Section title="Weather & Local" kicker="Rita Ranch intel">
              <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5">
                <div className="flex items-baseline justify-between">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                    Today
                  </div>
                  <div className="text-sm">
                    {typeof hi !== "undefined" || typeof lo !== "undefined" ? (
                      <span>
                        <span className="font-display">{hi ?? "—"}</span>
                        <span className="text-[color:var(--muted-ink)]"> / </span>
                        <span className="font-display">{lo ?? "—"}</span>
                      </span>
                    ) : (
                      <span className="text-[color:var(--muted-ink)]">—</span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted-ink)]">
                  {weatherNarrative ??
                    "Add weather.high / weather.low and weather.narrative in the briefing JSON."}
                </p>
              </div>
            </Section>

            <div className="mt-6">
              <Section
                title="Balances"
                kicker={balances?.asOf ? `as of ${balances.asOf}` : "Google Sheet snapshot"}
              >
                <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5">
                  {balances ? (
                    <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--muted-ink)]">
                          Savings
                        </div>
                        <div className="font-display mt-1 text-2xl border-b border-[color:var(--rule)] pb-1">
                          {formatUsd(balances.savings)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--muted-ink)]">
                          Checking
                        </div>
                        <div className="font-display mt-1 text-2xl border-b border-[color:var(--rule)] pb-1">
                          {formatUsd(balances.checking)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--muted-ink)]">
                          HSA
                        </div>
                        <div className="font-display mt-1 text-2xl border-b border-[color:var(--rule)] pb-1">
                          {formatUsd(balances.hsa)}
                        </div>
                      </div>

                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-[color:var(--muted-ink)]">
                          Retirement total
                        </div>
                        <div className="font-display mt-1 text-2xl border-b border-[color:var(--rule)] pb-1">
                          {formatUsd(balances.retirementTotal)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-[color:var(--muted-ink)]">
                      Add <span className="font-mono">balances</span> to the briefing JSON (
                      <span className="font-mono">savings</span>,
                      <span className="font-mono">checking</span>,
                      <span className="font-mono">hsa</span>,
                      <span className="font-mono">retirementTotal</span>).
                    </div>
                  )}
                </div>
              </Section>
            </div>

            <div className="mt-6">
              <Section
                title="Storage"
                kicker={
                  typeof storage?.root?.percentUsed === "number"
                    ? `${Math.round(storage.root.percentUsed)}% used`
                    : "disk snapshot"
                }
              >
                <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5">
                  <StorageSection storage={storage} />
                </div>
              </Section>
            </div>

            <div className="mt-6">
              <Section title="Mission Outlook" kicker="48-hour view">
                <div className="space-y-4">
                  <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                      Today
                    </div>
                    {cal.today.length ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {cal.today.slice(0, 6).map((e, idx) => (
                          <li key={idx} className="leading-6">
                            <span className="font-medium">
                              {e.tag ? `${e.tag} | ` : ""}
                            </span>
                            <span>{e.details ?? "(event)"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-sm text-[color:var(--muted-ink)]">
                        No events.
                      </div>
                    )}
                  </div>

                  <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-4">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                      Tomorrow
                    </div>
                    {cal.tomorrow.length ? (
                      <ul className="mt-2 space-y-2 text-sm">
                        {cal.tomorrow.slice(0, 6).map((e, idx) => (
                          <li key={idx} className="leading-6">
                            <span className="font-medium">
                              {e.tag ? `${e.tag} | ` : ""}
                            </span>
                            <span>{e.details ?? "(event)"}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-2 text-sm text-[color:var(--muted-ink)]">
                        No events.
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          </div>

          <div className="lg:col-span-12">
            <Section
              title="Newsletter Digest"
              kicker="last 24h (Gmail label: newsletters)"
            >
              {newsletters.length ? (
                <ul className="space-y-4">
                  {newsletters.slice(0, 3).map((n, idx) => {
                    const dt = n.receivedAt ? new Date(n.receivedAt) : null;
                    const dtText =
                      dt && !Number.isNaN(dt.valueOf())
                        ? dt.toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : null;

                    return (
                      <li
                        key={idx}
                        className="border-b border-[color:var(--rule)] pb-4"
                      >
                        <div className="text-[15px] leading-6">
                          {n.url ? (
                            <a
                              href={n.url}
                              target="_blank"
                              rel="noreferrer"
                              className="underline decoration-black/20 underline-offset-4 hover:decoration-black/40"
                            >
                              {n.subject}
                            </a>
                          ) : (
                            <span>{n.subject}</span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--muted-ink)]">
                          {n.sender ? n.sender : "Unknown sender"}
                          {dtText ? ` · ${dtText}` : ""}
                        </div>
                        {n.summary ? (
                          <p className="mt-2 text-[13px] leading-6 text-[color:var(--muted-ink)]">
                            {n.summary}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5 text-sm text-[color:var(--muted-ink)]">
                  No newsletters yet.
                </div>
              )}
            </Section>
          </div>

          <div className="lg:col-span-7">
            <Section title="Project Pulse" kicker="active work">
              {projects.length ? (
                <div className="space-y-4">
                  {projects.slice(0, 6).map((p, idx) => (
                    <div
                      key={idx}
                      className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="font-display text-lg">
                          {p.name ?? p.project ?? `Project ${idx + 1}`}
                        </div>
                        {p.vercelUrl ? (
                          <a
                            href={p.vercelUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-ink)] underline decoration-black/20 underline-offset-4"
                          >
                            Live
                          </a>
                        ) : null}
                      </div>
                      {Array.isArray(p.recentWins) && p.recentWins.length ? (
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                            Recent wins
                          </div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                            {p.recentWins.slice(0, 5).map((w: any, i: number) => (
                              <li key={i} className="leading-6">
                                {typeof w === "string" ? w : JSON.stringify(w)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {Array.isArray(p.stillToDo) && p.stillToDo.length ? (
                        <div className="mt-3">
                          <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                            Still to do
                          </div>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[color:var(--muted-ink)]">
                            {p.stillToDo.slice(0, 5).map((t: any, i: number) => (
                              <li key={i} className="leading-6">
                                {typeof t === "string" ? t : JSON.stringify(t)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5 text-sm text-[color:var(--muted-ink)]">
                  No projects yet.
                </div>
              )}
            </Section>
          </div>

          <div className="lg:col-span-5">
            <Section title="Intelligence Metrics" kicker="burn rate & pulse">
              <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5">
                <MetricsSection metrics={metrics} />
              </div>
            </Section>
          </div>
        </main>

        <footer className="mt-10 border-t border-[color:var(--rule)] pt-6 text-xs text-[color:var(--muted-ink)]">
          <div>
            Protected by Basic Auth · Ingest via shared secret · Designed in a NYT/WSJ
            newspaper style
          </div>
        </footer>
      </div>
    </div>
  );
}
