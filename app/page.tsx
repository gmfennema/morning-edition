import { readLatestBriefing, LATEST_KEY } from "../lib/storage";

export const dynamic = "force-dynamic";

type AnyObj = Record<string, any>;

type NewsItem = {
  headline: string;
  url?: string;
  source?: string;
  tag?: string;
};

type CalendarItem = {
  when?: string;
  tag?: string;
  details?: string;
};

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
        url: it.url ?? it.link,
        source: it.source ?? it.outlet,
        tag: it.tag,
      } satisfies NewsItem;
    })
    .filter(Boolean) as NewsItem[];
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
  const cal = normalizeCalendar(brief);

  const projects =
    (Array.isArray(brief?.projectPulse)
      ? brief.projectPulse
      : Array.isArray(brief?.projects)
        ? brief.projects
        : []) as any[];

  const metrics = brief?.intelligenceMetrics ?? brief?.metrics;

  const updatedAt = stored?.storedAt ? new Date(stored.storedAt) : null;
  const today = new Date();

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8">
        <header className="border-b border-[color:var(--rule)] pb-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--muted-ink)]">
                Executive Dashboard
              </div>
              <h1 className="font-display mt-1 text-4xl leading-none tracking-tight md:text-5xl">
                The Morning Edition
              </h1>
            </div>
            <div className="text-right">
              <div className="text-sm uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                {today.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="mt-1 text-xs text-[color:var(--muted-ink)]">
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
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-12">
            <Section title="Top Briefing" kicker="2-sentence synthesis">
              <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5">
                {executiveSummary ? (
                  <p className="text-[15px] leading-7">{executiveSummary}</p>
                ) : (
                  <p className="text-[15px] leading-7 text-[color:var(--muted-ink)]">
                    Waiting on the first briefing payload.
                  </p>
                )}
                <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-[color:var(--muted-ink)] md:grid-cols-2">
                  <div>
                    <div className="uppercase tracking-[0.18em]">Ingest endpoint</div>
                    <div className="mt-1 font-mono">POST /api/brief</div>
                  </div>
                  <div>
                    <div className="uppercase tracking-[0.18em]">Auth</div>
                    <div className="mt-1">
                      <span className="font-mono">x-shared-secret</span> or Bearer token
                    </div>
                  </div>
                </div>
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
                        </div>
                        <button
                          className="shrink-0 rounded-sm border border-[color:var(--rule)] bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]"
                          disabled
                          title="Investigate flow (Reporter Agent) will be wired next"
                        >
                          Investigate
                        </button>
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
                {metrics ? (
                  <pre className="max-h-[420px] overflow-auto text-xs leading-5 text-[color:var(--muted-ink)]">
                    {JSON.stringify(metrics, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-[color:var(--muted-ink)]">
                    Add <span className="font-mono">intelligenceMetrics</span> to the
                    briefing JSON.
                  </div>
                )}
              </div>
            </Section>

            <div className="mt-6">
              <Section title="Debug Info" kicker="System diagnostics">
                <div className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5 text-[10px] leading-4 text-[color:var(--muted-ink)]">
                  <div>Redis Key: {LATEST_KEY}</div>
                  <div>Data Present: {stored ? "Yes" : "No"}</div>
                  <div>Brief Object: {brief ? "Yes" : "No"}</div>
                  <div>Timestamp: {updatedAt?.toISOString() ?? "N/A"}</div>
                  <div className="mt-2 uppercase tracking-tighter">Env Checks:</div>
                  <div>KV_URL: {process.env.KV_REST_API_URL ? "Set" : "MISSING"}</div>
                  <div>KV_TOKEN: {process.env.KV_REST_API_TOKEN ? "Set" : "MISSING"}</div>
                </div>
              </Section>
            </div>

            <div className="mt-6">
              <Section title="Raw Payload" kicker="debug">
                <details className="rounded-sm border border-[color:var(--rule)] bg-white/60 p-5">
                  <summary className="cursor-pointer text-[11px] uppercase tracking-[0.18em] text-[color:var(--muted-ink)]">
                    View latest JSON
                  </summary>
                  <pre className="mt-4 max-h-[520px] overflow-auto text-xs leading-5">
                    {stored ? JSON.stringify(stored, null, 2) : "(none)"}
                  </pre>
                </details>
              </Section>
            </div>
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
