"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  User,
  FileText,
  Shield,
  Link as LinkIcon,
  Settings,
  Lock,
  Activity,
  Mail,
  Key,
  Bell,
  Newspaper,
  Loader2,
} from "lucide-react";
import type { QuoteSummaryData, StockPitch } from "@/lib/types";

type SectionId =
  | "profile"
  | "usage"
  | "pitches"
  | "security"
  | "connected"
  | "preferences"
  | "data";

const SECTION_IDS: SectionId[] = [
  "profile",
  "usage",
  "pitches",
  "security",
  "connected",
  "preferences",
  "data",
];

type TickerTapeMode = "default" | "portfolio" | "custom";

type ProfilePayload = {
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  bio: string | null;
  createdAt: string;
  providers: string[];
  tickerTapeMode?: TickerTapeMode;
  tickerTapeSymbols?: string[];
};

type StatsPayload = {
  pitchCount: number;
  watchlistCount: number;
  positionCount: number;
  alertCount: number;
};

function initialsFromName(name: string | null | undefined) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function pitchTypeLabel(pitch: StockPitch): string {
  const r = pitch.sections.recommendation.toLowerCase();
  if (/\bshort\b|bear thesis|sell thesis/i.test(r)) return "Short";
  if (/\bvalue\b|margin of safety|intrinsic/i.test(r)) return "Value";
  if (/special\s*situation|event-driven|spin-?off/i.test(r)) return "Special Situations";
  return "Growth";
}

function recLabel(pitch: StockPitch): string {
  const r = pitch.sections.recommendation;
  const m = r.match(/\b(Strong Buy|Buy|Sell|Hold|Overweight|Underweight)\b/i);
  return m ? m[1] : "View";
}

function formatMemberSince(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatPitchDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PrefToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="relative h-[18px] w-[34px] shrink-0 rounded-[9px] transition-colors duration-150 ease-out"
      style={{ backgroundColor: on ? "#c9a227" : "#2d333b" }}
    >
      <span
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all duration-150 ease-out"
        style={{ left: on ? "18px" : "2px" }}
      />
    </button>
  );
}

export default function AccountPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [savePending, setSavePending] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [pitches, setPitches] = useState<StockPitch[]>([]);
  const [pitchesLoading, setPitchesLoading] = useState(true);

  const [exportLoading, setExportLoading] = useState(false);
  const [deletePhase, setDeletePhase] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  const [alertEmails, setAlertEmails] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const [defaultModel, setDefaultModel] = useState("DCF");
  const [defaultPitchType, setDefaultPitchType] = useState("Growth");
  const [privacyMask, setPrivacyMask] = useState(false);
  const [tickerTape, setTickerTape] = useState(false);
  const [tickerTapeMode, setTickerTapeMode] = useState<TickerTapeMode>("default");
  const [tickerTapeCustomDraft, setTickerTapeCustomDraft] = useState("");
  const [tickerTapeSaving, setTickerTapeSaving] = useState(false);
  const [tickerTapeSaveError, setTickerTapeSaveError] = useState<string | null>(null);

  const setSectionRef = useCallback((id: SectionId) => {
    return (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "") as SectionId;
    if (SECTION_IDS.includes(hash)) setActiveSection(hash);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = localStorage.getItem("gcm_alert_emails");
    setAlertEmails(a !== "false");
    const w = localStorage.getItem("gcm_weekly_digest");
    setWeeklyDigest(w === "true");
    setDefaultModel(localStorage.getItem("gcm_default_model") ?? "DCF");
    setDefaultPitchType(localStorage.getItem("gcm_default_pitch_type") ?? "Growth");
    setPrivacyMask(localStorage.getItem("gcm_privacy_mask") === "true");
    setTickerTape(localStorage.getItem("gcm_ticker_tape") === "true");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProfileLoading(true);
      try {
        const res = await fetch("/api/account/profile");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as ProfilePayload;
        if (cancelled) return;
        setProfile(data);
        setDraftName(data.name ?? "");
        setDraftBio(data.bio ?? "");
        setTickerTapeMode(data.tickerTapeMode ?? "default");
        setTickerTapeCustomDraft((data.tickerTapeSymbols ?? []).join(", "));
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoading(true);
      try {
        const res = await fetch("/api/account/stats");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as StatsPayload;
        if (!cancelled) setStats(data);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPitchesLoading(true);
      try {
        const res = await fetch("/api/pitches");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as StockPitch[];
        if (!cancelled) setPitches(data.slice(0, 5));
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setPitchesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    window.location.hash = id;
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaveProfile = async () => {
    setSavePending(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: draftName, bio: draftBio }),
      });
      if (res.ok) {
        const updated = (await res.json()) as ProfilePayload;
        setProfile((p) =>
          p
            ? {
                ...p,
                name: updated.name,
                bio: updated.bio,
              }
            : null
        );
        setEditMode(false);
        setSavedToast(true);
        setTimeout(() => setSavedToast(false), 2000);
        // Refresh the JWT session so the Navbar shows the updated name
        await update({ name: draftName || null });
        router.refresh();
      }
    } catch {
      /* silent */
    } finally {
      setSavePending(false);
    }
  };

  const parseCustomSymbolsFromDraft = (s: string): string[] => {
    const SYMBOL_REGEX = /^[A-Za-z0-9.-]{1,10}$/;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const part of s.split(/[\s,]+/).filter(Boolean)) {
      const u = part.trim().toUpperCase();
      if (!SYMBOL_REGEX.test(u)) continue;
      if (seen.has(u)) continue;
      seen.add(u);
      out.push(u);
      if (out.length >= 10) break;
    }
    return out;
  };

  const handleSaveTickerTape = async () => {
    setTickerTapeSaveError(null);
    setTickerTapeSaving(true);
    try {
      const body: { tickerTapeMode: TickerTapeMode; tickerTapeSymbols?: string[] } = {
        tickerTapeMode,
      };
      if (tickerTapeMode === "custom") {
        const syms = parseCustomSymbolsFromDraft(tickerTapeCustomDraft);
        if (syms.length === 0) {
          setTickerTapeSaveError(
            "Add at least one valid ticker (letters, numbers, dots, dashes, max 10)."
          );
          return;
        }
        body.tickerTapeSymbols = syms;
      }
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json().catch(() => null)) as { error?: string } | ProfilePayload | null;
      if (!res.ok) {
        setTickerTapeSaveError(
          typeof j && j && "error" in j && typeof j.error === "string"
            ? j.error
            : "Could not save."
        );
        return;
      }
      const updated = j as ProfilePayload;
      setProfile((p) =>
        p
          ? {
              ...p,
              tickerTapeMode: updated.tickerTapeMode,
              tickerTapeSymbols: updated.tickerTapeSymbols,
            }
          : null
      );
      setTickerTapeMode(updated.tickerTapeMode ?? "default");
      setTickerTapeCustomDraft((updated.tickerTapeSymbols ?? []).join(", "));
      router.refresh();
    } catch {
      setTickerTapeSaveError("Could not save.");
    } finally {
      setTickerTapeSaving(false);
    }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/account/export");
      if (!res.ok) return;
      const cd = res.headers.get("Content-Disposition");
      let filename = `globalfin-export-${new Date().toISOString().split("T")[0]}.json`;
      if (cd) {
        const m = cd.match(/filename="([^"]+)"/);
        if (m) filename = m[1];
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    } finally {
      setExportLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletePending(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "DELETE",
        redirect: "manual",
      });
      if (res.status === 302 || res.status === 307 || res.status === 0) {
        const loc = res.headers.get("Location");
        if (loc) {
          window.location.href = loc;
          return;
        }
      }
      if (res.redirected && res.url) {
        window.location.href = res.url;
        return;
      }
      if (res.ok) {
        window.location.href = "/login?deleted=1";
      }
    } catch {
      /* silent */
    } finally {
      setDeletePending(false);
    }
  };

  const handleExportWord = async (pitch: StockPitch) => {
    try {
      const res = await fetch(`/api/stocks?action=summary&symbol=${encodeURIComponent(pitch.symbol)}`);
      if (!res.ok) return;
      const stockData = (await res.json()) as QuoteSummaryData;
      const w = await fetch("/api/pitch/export-word", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stockData, sections: pitch.sections }),
      });
      if (!w.ok) return;
      const blob = await w.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${pitch.symbol}_pitch_${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* silent */
    }
  };

  const emailVerified =
    profile?.emailVerified != null
      ? new Date(profile.emailVerified)
      : session?.user?.emailVerified
        ? new Date(session.user.emailVerified as unknown as string)
        : null;

  const providers = profile?.providers ?? [];

  const sidebarLink = (id: SectionId, label: string, Icon: typeof User) => {
    const active = activeSection === id;
    return (
      <button
        type="button"
        onClick={() => scrollToSection(id)}
        className={
          active
            ? "flex items-center gap-2.5 px-3 py-2 rounded-lg bg-card text-foreground text-sm w-full text-left"
            : "flex items-center gap-2.5 px-3 py-2 rounded-lg text-muted hover:bg-card text-sm transition-colors w-full text-left"
        }
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : "text-muted"}`} />
        {label}
      </button>
    );
  };

  const pitchCount = stats?.pitchCount ?? 0;

  if (status === "loading") {
    return (
      <div className="flex justify-center py-16 text-muted text-sm">Loading…</div>
    );
  }

  return (
    <div className="w-full max-w-[900px] mx-auto px-1">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground tracking-tight">Account</h1>
        <p className="text-sm text-muted mt-1">Manage your profile, security, and data</p>
      </header>

      <div className="flex gap-6 flex-col md:flex-row">
        <aside className="w-full md:w-[220px] shrink-0 space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/70 px-3 mb-1.5">
              Account
            </p>
            <nav className="space-y-0.5">
              {sidebarLink("profile", "Profile", User)}
              {sidebarLink("usage", "Usage", Activity)}
              {sidebarLink("pitches", "Saved pitches", FileText)}
              {sidebarLink("security", "Security", Shield)}
              {sidebarLink("connected", "Connected accounts", LinkIcon)}
            </nav>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted/70 px-3 mb-1.5">
              Data
            </p>
            <nav className="space-y-0.5">
              {sidebarLink("preferences", "Preferences", Settings)}
              {sidebarLink("data", "Data & privacy", Lock)}
            </nav>
          </div>
        </aside>

        <div className="flex-1 min-w-0 space-y-6">
          {/* Profile */}
          <section
            id="profile"
            ref={setSectionRef("profile")}
            className="rounded-xl border border-[#2d333b] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Profile</h2>
                <p className="text-xs text-muted mt-0.5">
                  Your personal details and display preferences
                </p>
              </div>
              <button
                type="button"
                disabled={profileLoading || savePending}
                onClick={() => {
                  if (editMode) {
                    void handleSaveProfile();
                  } else {
                    setEditMode(true);
                    setDraftName(profile?.name ?? "");
                    setDraftBio(profile?.bio ?? "");
                  }
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold bg-[#c9a227] text-[#0c0e14] hover:opacity-90 disabled:opacity-50"
              >
                {editMode ? (savePending ? "Saving…" : "Save changes") : "Edit"}
              </button>
            </div>
            <div className="p-5 space-y-5">
              {profileLoading ? (
                <p className="text-sm text-muted">Loading profile…</p>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div
                      className="h-[52px] w-[52px] rounded-full flex items-center justify-center text-[#0c0e14] font-semibold text-lg shrink-0"
                      style={{
                        background: "linear-gradient(135deg, #c9a227, #e8b830)",
                      }}
                    >
                      {initialsFromName(profile?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {profile?.name ?? "—"}
                      </p>
                      <p className="text-sm text-muted">{profile?.email ?? "—"}</p>
                      <p className="text-xs text-muted mt-1">
                        Member since{" "}
                        {profile?.createdAt ? formatMemberSince(profile.createdAt) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">
                        Display name
                      </label>
                      {editMode ? (
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="w-full rounded-lg border border-[#2d333b] bg-background px-3 py-2 text-sm text-foreground"
                          maxLength={100}
                        />
                      ) : (
                        <p className="text-sm text-foreground">{profile?.name ?? "—"}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Email</label>
                      {editMode ? (
                        <>
                          <input
                            value={profile?.email ?? ""}
                            disabled
                            className="w-full rounded-lg border border-[#2d333b] bg-[#1c2128] px-3 py-2 text-sm text-muted cursor-not-allowed"
                          />
                          <p className="text-[11px] text-muted mt-1">Email cannot be changed</p>
                        </>
                      ) : (
                        <p className="text-sm text-muted">{profile?.email ?? "—"}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted mb-1">Bio</label>
                      {editMode ? (
                        <>
                          <textarea
                            value={draftBio}
                            onChange={(e) => setDraftBio(e.target.value.slice(0, 200))}
                            placeholder="e.g. Finance student at Western · CFA Level I candidate"
                            rows={4}
                            className="w-full rounded-lg border border-[#2d333b] bg-background px-3 py-2 text-sm text-foreground resize-y min-h-[88px]"
                            maxLength={200}
                          />
                          <p className="text-[11px] text-muted mt-1">
                            Appears on exported pitches and Word documents
                          </p>
                          <p className="text-[11px] text-muted text-right">{draftBio.length} / 200</p>
                        </>
                      ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {profile?.bio?.trim() ? profile.bio : "—"}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Usage */}
          <section
            id="usage"
            ref={setSectionRef("usage")}
            className="rounded-xl border border-[#2d333b] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128]">
              <h2 className="text-base font-semibold text-foreground">Platform usage</h2>
              <p className="text-xs text-muted mt-0.5">Saved content and alerts at a glance</p>
            </div>
            <div className="p-5">
              {statsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="h-16 rounded-lg bg-[#1c2128] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Pitches saved", v: stats?.pitchCount ?? 0 },
                    { label: "Watchlist items", v: stats?.watchlistCount ?? 0 },
                    { label: "Positions tracked", v: stats?.positionCount ?? 0 },
                    { label: "Active alerts", v: stats?.alertCount ?? 0 },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="rounded-lg px-3 py-2.5"
                      style={{
                        background: "#1c2128",
                        borderRadius: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <p
                        className="text-lg tabular-nums"
                        style={{ fontFamily: "var(--font-mono-pro), ui-monospace, monospace", color: "#c9a227" }}
                      >
                        {row.v}
                      </p>
                      <p className="text-[11px] text-muted uppercase tracking-wider mt-1">
                        {row.label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Pitches */}
          <section
            id="pitches"
            ref={setSectionRef("pitches")}
            className="rounded-xl border border-[#2d333b] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">Saved pitches</h2>
                <p className="text-xs text-muted mt-0.5">
                  {pitchCount} investment memo{pitchCount === 1 ? "" : "s"} · sorted by most recent
                </p>
              </div>
              <Link
                href="/pitch"
                className="text-sm text-accent hover:underline shrink-0"
              >
                View all →
              </Link>
            </div>
            <div className="p-5">
              {pitchesLoading ? (
                <p className="text-sm text-muted">Loading pitches…</p>
              ) : pitches.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <p className="text-sm text-muted max-w-md mx-auto">
                    No pitches saved yet. Head to the Pitch Builder to create your first investment
                    memo.
                  </p>
                  <Link
                    href="/pitch"
                    className="inline-flex rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-4 py-2 text-sm transition-colors"
                  >
                    Open Pitch Builder
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {pitches.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-2 border-b border-[#1c2128] last:border-0"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-mono text-xs px-2 py-0.5 rounded-md"
                            style={{
                              background: "rgba(201,162,39,0.08)",
                              color: "#c9a227",
                            }}
                          >
                            {p.symbol}
                          </span>
                          <span className="text-[13px] font-medium text-foreground">
                            {p.companyName}
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-1">
                          {pitchTypeLabel(p)} · {recLabel(p)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-muted">
                          {formatPitchDate(p.updatedAt)}
                        </span>
                        <Link
                          href={`/pitch?pitch=${encodeURIComponent(p.id)}`}
                          className="rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-2.5 py-1 text-xs transition-colors"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => void handleExportWord(p)}
                          className="rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-2.5 py-1 text-xs transition-colors"
                        >
                          Export
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Security */}
          <section
            id="security"
            ref={setSectionRef("security")}
            className="rounded-xl border border-[#2d333b] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128]">
              <h2 className="text-base font-semibold text-foreground">Security</h2>
              <p className="text-xs text-muted mt-0.5">Sign-in and notification preferences</p>
            </div>
            <div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">Email verification</p>
                    <p className="text-xs text-muted truncate">{session?.user?.email ?? profile?.email}</p>
                  </div>
                </div>
                {emailVerified ? (
                  <span className="text-xs px-2 py-0.5 rounded border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] text-[#22c55e] shrink-0">
                    Verified
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded border border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.1)] text-[#ef4444] shrink-0">
                    Not verified
                  </span>
                )}
              </div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Key className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">Password</p>
                    <p className="text-xs text-muted">Change your account password</p>
                  </div>
                </div>
                <Link
                  href="/forgot-password"
                  className="text-sm rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-3 py-1.5 transition-colors shrink-0"
                >
                  Change →
                </Link>
              </div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Bell className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">Price alert emails</p>
                    <p className="text-xs text-muted">Send me an email when alerts trigger</p>
                    {/* TODO: Wire gcm_alert_emails to /api/alerts/check (or mailer) when email pipeline is ready */}
                  </div>
                </div>
                <PrefToggle
                  on={alertEmails}
                  onChange={(v) => {
                    setAlertEmails(v);
                    localStorage.setItem("gcm_alert_emails", v ? "true" : "false");
                  }}
                />
              </div>
              <div className="px-5 py-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Newspaper className="h-4 w-4 text-muted shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">Weekly market digest</p>
                    <p className="text-xs text-muted">Sunday morning macro summary email</p>
                    {/* TODO: Wire gcm_weekly_digest to future digest email job */}
                  </div>
                </div>
                <PrefToggle
                  on={weeklyDigest}
                  onChange={(v) => {
                    setWeeklyDigest(v);
                    localStorage.setItem("gcm_weekly_digest", v ? "true" : "false");
                  }}
                />
              </div>
            </div>
          </section>

          {/* Connected */}
          <section
            id="connected"
            ref={setSectionRef("connected")}
            className="rounded-xl border border-[#2d333b] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128]">
              <h2 className="text-base font-semibold text-foreground">Connected accounts</h2>
              <p className="text-xs text-muted mt-0.5">OAuth providers linked to your login</p>
            </div>
            <div>
              {(["google", "github"] as const).map((provider, idx, arr) => {
                const linked = providers.includes(provider);
                const label = provider === "google" ? "Google" : "GitHub";
                const letter = provider === "google" ? "G" : "GH";
                return (
                  <div
                    key={provider}
                    className={`px-5 py-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      idx < arr.length - 1 ? "border-b border-[#1c2128]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-[30px] w-[30px] rounded bg-[#1c2128] flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                        {letter}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground">{label}</p>
                        <p className="text-xs text-muted">
                          {linked ? "Signed in with this provider" : "Not linked"}
                        </p>
                      </div>
                    </div>
                    {linked ? (
                      <span className="text-xs px-2 py-0.5 rounded border border-[rgba(34,197,94,0.2)] bg-[rgba(34,197,94,0.1)] text-[#22c55e] shrink-0">
                        Connected
                      </span>
                    ) : (
                      <a
                        href={`/api/auth/signin/${provider}`}
                        className="text-sm rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-3 py-1.5 transition-colors shrink-0"
                      >
                        Connect →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Preferences */}
          <section
            id="preferences"
            ref={setSectionRef("preferences")}
            className="rounded-xl border border-[#2d333b] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128]">
              <h2 className="text-base font-semibold text-foreground">Preferences</h2>
              <p className="text-xs text-muted mt-0.5">Defaults for models and the app shell</p>
            </div>
            <div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">Default model</p>
                  <p className="text-xs text-muted">Pre-select when opening Financial Models</p>
                </div>
                <select
                  value={defaultModel}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDefaultModel(v);
                    localStorage.setItem("gcm_default_model", v);
                  }}
                  className="rounded-lg border border-[#2d333b] bg-background text-sm text-foreground px-2 py-1.5 max-w-[200px]"
                >
                  <option value="DCF">DCF</option>
                  <option value="Comps">Comps</option>
                  <option value="LBO">LBO</option>
                </select>
              </div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">Default pitch type</p>
                  <p className="text-xs text-muted">Pre-select in the Pitch Builder</p>
                </div>
                <select
                  value={defaultPitchType}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDefaultPitchType(v);
                    localStorage.setItem("gcm_default_pitch_type", v);
                  }}
                  className="rounded-lg border border-[#2d333b] bg-background text-sm text-foreground px-2 py-1.5 max-w-[220px]"
                >
                  <option value="Growth">Growth</option>
                  <option value="Value">Value</option>
                  <option value="Special Situations">Special Situations</option>
                  <option value="Short">Short</option>
                </select>
              </div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">Portfolio privacy mask</p>
                  <p className="text-xs text-muted">Hide portfolio values by default</p>
                </div>
                <PrefToggle
                  on={privacyMask}
                  onChange={(v) => {
                    setPrivacyMask(v);
                    localStorage.setItem("gcm_privacy_mask", v ? "true" : "false");
                  }}
                />
              </div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">Ticker tape</p>
                  <p className="text-xs text-muted">Show scrolling prices at the top</p>
                </div>
                <PrefToggle
                  on={tickerTape}
                  onChange={(v) => {
                    setTickerTape(v);
                    localStorage.setItem("gcm_ticker_tape", v ? "true" : "false");
                    window.dispatchEvent(new Event("gcm-prefs-change"));
                  }}
                />
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <div>
                  <p className="text-sm text-foreground">Tape symbols</p>
                  <p className="text-xs text-muted mt-0.5">
                    Default list, up to 10 holdings from your portfolio, or your own list (max 10).
                  </p>
                </div>
                <select
                  value={tickerTapeMode}
                  onChange={(e) => {
                    setTickerTapeMode(e.target.value as TickerTapeMode);
                    setTickerTapeSaveError(null);
                  }}
                  className="rounded-lg border border-[#2d333b] bg-background text-sm text-foreground px-2 py-1.5 max-w-md w-full"
                >
                  <option value="default">Default (indices &amp; liquid names)</option>
                  <option value="portfolio">My portfolio (first 10 positions)</option>
                  <option value="custom">Custom (enter up to 10 tickers)</option>
                </select>
                {tickerTapeMode === "custom" ? (
                  <textarea
                    value={tickerTapeCustomDraft}
                    onChange={(e) => {
                      setTickerTapeCustomDraft(e.target.value);
                      setTickerTapeSaveError(null);
                    }}
                    rows={3}
                    placeholder="e.g. AAPL, MSFT, NVDA, ^GSPC"
                    className="rounded-lg border border-[#2d333b] bg-background text-sm text-foreground px-3 py-2 max-w-md w-full font-mono placeholder:text-muted resize-y min-h-[4.5rem]"
                  />
                ) : null}
                {tickerTapeSaveError ? (
                  <p className="text-xs text-[#ef4444]">{tickerTapeSaveError}</p>
                ) : null}
                <button
                  type="button"
                  disabled={tickerTapeSaving}
                  onClick={() => void handleSaveTickerTape()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-3 py-1.5 text-sm transition-colors disabled:opacity-50 w-fit"
                >
                  {tickerTapeSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Save tape settings
                </button>
              </div>
            </div>
          </section>

          {/* Data */}
          <section
            id="data"
            ref={setSectionRef("data")}
            className="rounded-xl border border-[rgba(239,68,68,0.2)] bg-[#13161d] overflow-hidden scroll-mt-6"
          >
            <div className="px-5 py-4 border-b border-[#1c2128]">
              <h2 className="text-base font-semibold text-foreground">Data & privacy</h2>
              <p className="text-xs text-muted mt-0.5">Export or permanently delete your account</p>
            </div>
            <div>
              <div className="px-5 py-[11px] border-b border-[#1c2128] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-foreground">Export my data</p>
                  <p className="text-xs text-muted max-w-xl">
                    Download all your pitches, portfolio, watchlist, and alerts as a JSON file
                  </p>
                </div>
                <button
                  type="button"
                  disabled={exportLoading}
                  onClick={() => void handleExportData()}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-3 py-1.5 text-sm transition-colors disabled:opacity-50"
                >
                  {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Export →
                </button>
              </div>
              <div className="px-5 py-[11px]">
                {!deletePhase ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-foreground">Delete account</p>
                      <p className="text-xs text-muted max-w-xl">
                        Permanently remove your account and all associated data. This cannot be
                        undone.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setDeletePhase(true);
                        setDeleteInput("");
                      }}
                      className="rounded-lg border border-[rgba(239,68,68,0.3)] text-[#ef4444] bg-transparent px-3 py-1.5 text-sm hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      Delete →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-foreground">Type DELETE to confirm:</p>
                    <input
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      className="w-full max-w-xs rounded-lg border border-[#2d333b] bg-background px-3 py-2 text-sm text-foreground font-mono"
                      autoComplete="off"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={deleteInput !== "DELETE" || deletePending}
                        onClick={() => void handleDeleteAccount()}
                        className="rounded-lg border border-[rgba(239,68,68,0.3)] text-[#ef4444] bg-transparent px-3 py-1.5 text-sm disabled:opacity-40"
                      >
                        {deletePending ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletePhase(false);
                          setDeleteInput("");
                        }}
                        className="rounded-lg border border-[#2d333b] text-muted hover:text-foreground px-3 py-1.5 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {savedToast && (
        <div
          className="fixed bottom-6 right-6 z-[100] rounded-[9px] border border-[#2d333b] bg-[#13161d] px-4 py-2.5 text-[13px] text-[#22c55e] shadow-lg"
          style={{ animation: "fade 0.2s ease" }}
        >
          ✓ Changes saved
        </div>
      )}
    </div>
  );
}
