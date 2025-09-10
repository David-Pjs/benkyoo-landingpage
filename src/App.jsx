import React, { useEffect, useMemo, useState } from "react";

/* ---------------- Edit these fallback links ---------------- */
const FALLBACK_LINKS = {
  windows: {
    zip: "/downloads/Benkyoo-0.1.5-Setup.zip",
    portable: "/downloads/Benkyoo-0.1.5-Portable.exe",
    installer: "/downloads/Benkyoo-0.1.5-Setup.exe",
  },
  // Add mac/linux later if you have them
};

/* ---------------- Helpers ---------------- */
const cn = (...a) => a.filter(Boolean).join(" ");

function detectOS() {
  const uaData = navigator.userAgentData;
  const plat = (uaData?.platform || navigator.platform || "").toLowerCase();
  const ua = (navigator.userAgent || "").toLowerCase();
  if (plat.includes("win") || ua.includes("windows")) return "windows";
  if (plat.includes("mac") || ua.includes("mac os") || ua.includes("macintosh")) return "mac";
  if (plat.includes("linux") || ua.includes("linux")) return "linux";
  return "other";
}

function isAppleSilicon() {
  const ua = navigator.userAgent || "";
  return /arm64/i.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 0);
}

/* ---------------- Small UI atoms ---------------- */
const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-500/30">
    {children}
  </span>
);

const Card = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/30">
    <div className="mb-2 text-base font-semibold">{title}</div>
    <div className="text-sm text-slate-300">{children}</div>
  </div>
);

/* ---------------- Releases hook ---------------- */
function useReleases(url = "/releases.json", timeoutMs = 5000) {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);

    fetch(url, { cache: "no-store", signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.statusText))))
      .then((json) => setState({ loading: false, data: json, error: null }))
      .catch((err) => setState({ loading: false, data: null, error: err }));

    return () => {
      ctl.abort();
      clearTimeout(t);
    };
  }, [url, timeoutMs]);

  return state;
}

/* ---------------- Download block ---------------- */
function SmartDownloadArea() {
  const os = useMemo(() => detectOS(), []);
  const apple = useMemo(() => isAppleSilicon(), []);
  const { loading, data, error } = useReleases();

  // Normalize JSON + fallback
  const links = useMemo(() => {
    const d = data || {};
    const win = d.windows || {};
    const mac = d.mac || {};
    const lin = d.linux || {};
    return {
      windows: {
        zip: win.zip || FALLBACK_LINKS.windows?.zip,
        portable: win.portable || FALLBACK_LINKS.windows?.portable,
        installer: win.installer || FALLBACK_LINKS.windows?.installer,
        sha256: win.sha256,
      },
      mac: { arm64: mac.arm64, x64: mac.x64, sha256: mac.sha256 },
      linux: { appImage: lin.appImage, sha256: lin.sha256 },
      version: d.version,
      notes: d.releaseNotesUrl,
    };
  }, [data]);

  // Primary link + label
  let primaryHref = "";
  let primaryLabel = "Download";
  if (os === "windows") {
    primaryHref = links.windows.zip || links.windows.installer || links.windows.portable || "";
    primaryLabel = "Download for Windows (.zip)";
  } else if (os === "mac") {
    const macHref = apple ? links.mac.arm64 : links.mac.x64;
    primaryHref = macHref || links.windows.zip || "";
    primaryLabel = apple ? "Download for macOS (Apple Silicon)" : "Download for macOS (Intel)";
  } else if (os === "linux") {
    primaryHref = links.linux.appImage || links.windows.zip || "";
    primaryLabel = "Download for Linux (AppImage)";
  } else {
    primaryHref = links.windows.zip || "";
    primaryLabel = "Download (Windows .zip)";
  }

  const isWindows = os === "windows";
  const safeHref = primaryHref || FALLBACK_LINKS.windows?.zip || "#";
  const disabled = safeHref === "#";

  // *** Button styling: slightly dim indigo background, VERY clear text, same size ***
  // - Keep text size small (text-sm) so it's not bigger
  // - Use white text + subtle ring + shadow to pop against dark bg
  const primaryClasses = isWindows
    ? "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold " +
      "bg-indigo-700/80 text-white ring-1 ring-inset ring-white/15 shadow-md hover:bg-indigo-600/90 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
    : "inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold " +
      "bg-slate-300 text-slate-900 ring-1 ring-inset ring-white/20 hover:bg-slate-200 " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

  const Secondary = ({ href, children }) =>
    href ? (
      <a
        href={href}
        className="inline-flex items-center justify-center rounded-xl bg-slate-800/90 px-4 py-2 text-sm font-semibold text-white/95 ring-1 ring-slate-700 hover:bg-slate-700"
      >
        {children}
      </a>
    ) : null;

  const CopyHash = ({ value }) =>
    value ? (
      <button
        onClick={() => navigator.clipboard?.writeText(value)}
        className="text-[11px] text-slate-400 underline decoration-slate-700 hover:decoration-slate-400"
      >
        copy SHA256
      </button>
    ) : null;

  return (
    <div>
      {/* Primary CTA */}
      <a
        href={safeHref}
        download
        rel="noopener"
        aria-disabled={disabled}
        className={cn(primaryClasses, disabled && "cursor-not-allowed opacity-60")}
      >
        <svg viewBox="0 0 24 24" className="mr-2 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="select-none">Download for Windows (.zip)</span>
      </a>

      {/* Mirrors */}
      <div className="mt-3 flex flex-wrap gap-3">
        {os === "windows" && (
          <>
            <Secondary href={links.windows.portable}>Portable .exe</Secondary>
            <Secondary href={links.windows.installer}>Installer (.exe)</Secondary>
          </>
        )}
        {os === "mac" && (
          <>
            <Secondary href={links.mac.arm64}>Apple Silicon (.zip)</Secondary>
            <Secondary href={links.mac.x64}>Intel (.zip)</Secondary>
          </>
        )}
        {os === "linux" && <Secondary href={links.linux.appImage}>Linux AppImage</Secondary>}
      </div>

      {/* Meta + notes */}
      <div className="mt-2 text-xs text-slate-400">
        {links.version && <span>Latest version: {links.version}. </span>}
        {error && <span className="text-amber-300">Using fallback links (releases.json unavailable).</span>}
      </div>

      {links.windows.sha256 && isWindows && (
        <div className="mt-1 text-[11px] text-slate-500">
          SHA256: <code className="select-all">{links.windows.sha256}</code> <CopyHash value={links.windows.sha256} />
        </div>
      )}

      {links.notes && (
        <a
          href={links.notes}
          className="mt-3 inline-block text-xs text-slate-400 underline decoration-slate-600 hover:decoration-slate-400"
        >
          Release notes
        </a>
      )}

      <p className="mt-3 text-xs text-slate-400">
        Windows SmartScreen may appear for unsigned apps. Click <b>More info → Run anyway</b>.
      </p>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function App() {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-white">
      {/* NAV */}
      <header className="mx-auto flex w-full items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-indigo-600 font-bold">B</div>
          <div className="text-lg font-semibold">Benkyoo</div>
        </div>
        <nav className="hidden gap-6 text-sm text-slate-300 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="w-full px-6 lg:px-14">
        <div className="mx-auto grid min-h-[calc(100vh-96px)] w-full grid-cols-1 items-center gap-10 lg:grid-cols-2">
          <div className="max-w-none">
            <Badge>Launch Week</Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight lg:text-5xl">
              Study better with a focused <span className="text-indigo-400">desktop app</span>.
            </h1>

            <p className="mt-4 max-w-2xl text-slate-300">
              Benkyoo helps you organize study goals, track reading progress, and stay focused with a built-in reader and
              pomodoro timer — all offline, on your computer.
            </p>

            <div className="mt-6">
              <SmartDownloadArea />
            </div>

            <div className="mt-4 text-xs text-slate-400">
              No accounts. Your data stays on your device. Export/Import anytime.
            </div>
          </div>

          {/* Mock screen */}
          <div className="relative">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-2xl shadow-black/50">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500/70" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
                <div className="h-3 w-3 rounded-full bg-green-500/70" />
                <span className="ml-3 text-xs text-slate-400">Benkyoo — Dashboard</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-slate-800/60 p-4">
                  <div className="text-sm font-semibold">Goals</div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-300">
                    <li>• Finish Chapter 5</li>
                    <li>• Practice 20 flashcards</li>
                    <li>• Review notes (15m)</li>
                  </ul>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-4">
                  <div className="text-sm font-semibold">Pomodoro</div>
                  <div className="mt-2 text-3xl font-bold">25:00</div>
                  <div className="mt-1 text-xs text-slate-400">Work session</div>
                </div>
                <div className="rounded-xl bg-slate-800/60 p-4 lg:col-span-2">
                  <div className="text-sm font-semibold">Reader Progress</div>
                  <div className="mt-2 h-2 w-full rounded bg-slate-800">
                    <div className="h-2 w-2/3 rounded bg-indigo-500" />
                  </div>
                  <div className="mt-2 text-xs text-slate-400">64% of "Linear Algebra Notes.pdf"</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="w-full px-6 py-12 lg:px-14">
        <h2 className="mb-6 text-2xl font-bold">What you can do</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Organize goals">Break work into trackable goals with due dates and reminders.</Card>
          <Card title="Built-in PDF reader">Pick up where you left off. Last page & zoom are remembered.</Card>
          <Card title="Pomodoro focus">Stay on task with work/break timers and gentle notifications.</Card>
          <Card title="Local-first">Everything is saved on your device. No sign-up required.</Card>
          <Card title="Backup & restore">Export all data to JSON; import it later on any machine.</Card>
          <Card title="Lightweight">Fast, small download. Works offline after install.</Card>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="w-full px-6 py-12 lg:px-14">
        <h2 className="mb-4 text-2xl font-bold">How it works (from the Release)</h2>
        <ol className="space-y-3 text-slate-300">
          <li>
            1. Click the download above. On Windows you’ll usually see three options:
            <ul className="mt-2 list-disc pl-6 text-sm">
              <li><b>ZIP:</b> unzip, then run <b>Benkyoo.exe</b>.</li>
              <li><b>Portable .exe:</b> single file, runs without installing.</li>
              <li><b>Installer (.exe):</b> installs to Start Menu/Programs.</li>
            </ul>
          </li>
          <li>2. If SmartScreen shows, click <b>More info → Run anyway</b> (unsigned during launch).</li>
          <li>3. Open Benkyoo, add goals, open your PDFs, and start a 25-minute focus session.</li>
        </ol>
      </section>

      {/* FAQ */}
      <section id="faq" className="w-full px-6 py-12 lg:px-14">
        <h2 className="mb-4 text-2xl font-bold">FAQ</h2>
        <div className="space-y-4 text-slate-300">
          <div>
            <div className="font-semibold">Is it free?</div>
            <p className="text-sm">Yes, during launch. You can donate or give feedback later.</p>
          </div>
          <div>
            <div className="font-semibold">Which file should I choose?</div>
            <p className="text-sm">
              If unsure, use the <b>ZIP</b>. Unzip and run <b>Benkyoo.exe</b>. The <b>Portable</b> exe needs no install; the
              <b> Installer</b> adds shortcuts.
            </p>
          </div>
          <div>
            <div className="font-semibold">Where is my data stored?</div>
            <p className="text-sm">Locally on your device. Use Settings → Export to back up a JSON file.</p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-8">
        <div className="mx-auto flex w-full flex-col items-center justify-between gap-3 px-6 text-sm text-slate-400 md:flex-row lg:px-14">
          <div>© {new Date().getFullYear()} Benkyoo</div>
          <div className="flex items-center gap-4">
            <a href="#features" className="hover:text-slate-200">Features</a>
            <a href="#how" className="hover:text-slate-200">How it works</a>
            <a href="#faq" className="hover:text-slate-200">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
