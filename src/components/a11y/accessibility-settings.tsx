'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Accessibility,
  ArrowDownToLine,
  Contrast,
  FileText,
  Link2,
  Minus,
  PauseCircle,
  Plus,
  RotateCcw,
  Type,
  X,
} from 'lucide-react';

/**
 * Accessibility button + preferences panel.
 *
 * A real, first-party accessibility control — not a third-party overlay. Every
 * option maps to a class on <html> (or the root font-size) and to a key in
 * localStorage under `makkah-a11y`. A blocking init script in the root layout
 * applies those same classes before first paint, so a returning visitor never
 * sees a flash of the default styling.
 *
 * The toggles here only mirror and mutate that state; the actual visual effect
 * lives in globals.css so it survives navigation and works even if this island
 * has not hydrated yet.
 *
 * RTL + a11y contract:
 *  - Trigger sits at the inline-start bottom corner (`start-*`), i.e. the LEFT
 *    in Hebrew, and stays clear of the mobile safe area.
 *  - The panel is a modal dialog: focus moves in on open, is trapped while open,
 *    Escape closes it, and focus returns to the trigger.
 */

const STORAGE_KEY = 'makkah-a11y';
const FONT_STEPS = [90, 100, 110, 120, 130, 140] as const;
const DEFAULT_SCALE = 100;

type Settings = {
  fontScale: number;
  contrast: boolean;
  links: boolean;
  stopMotion: boolean;
  readable: boolean;
};

const DEFAULTS: Settings = {
  fontScale: DEFAULT_SCALE,
  contrast: false,
  links: false,
  stopMotion: false,
  readable: false,
};

function readStored(): Settings {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    return DEFAULTS;
  }
}

/** Writes settings to <html> (classes + root font-size) and persists them. */
function applySettings(next: Settings) {
  const el = document.documentElement;
  el.classList.toggle('a11y-contrast', next.contrast);
  el.classList.toggle('a11y-links', next.links);
  el.classList.toggle('a11y-stop-motion', next.stopMotion);
  el.classList.toggle('a11y-readable', next.readable);
  if (next.fontScale !== DEFAULT_SCALE) {
    el.style.fontSize = `${next.fontScale}%`;
  } else {
    el.style.removeProperty('font-size');
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the classes are still applied for this session */
  }
  // Notify motion-driving components (hero timeline, video) of a change.
  window.dispatchEvent(new Event('a11y-change'));
}

export function AccessibilitySettings() {
  const [open, setOpen] = useState(false);
  // Lazy initial state reads whatever the blocking init script already applied.
  // The panel is closed on first render, so nothing settings-dependent is in the
  // hydrated DOM and there is no server/client mismatch — and this avoids the
  // forbidden setState-in-effect pattern.
  const [settings, setSettings] = useState<Settings>(() => readStored());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // State updaters are PURE — they only compute the next settings object. All
  // DOM/localStorage/event side effects happen in the effect below, AFTER React
  // commits. Doing them inside the updater dispatched `a11y-change` during
  // render, which synchronously notified useSyncExternalStore subscribers
  // (PageTransition) and produced "Cannot update a component while rendering a
  // different component". See docs/… and the regression test.
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const stepFont = useCallback((direction: 1 | -1) => {
    setSettings((prev) => {
      const index = FONT_STEPS.indexOf(prev.fontScale as (typeof FONT_STEPS)[number]);
      const base = index === -1 ? FONT_STEPS.indexOf(DEFAULT_SCALE) : index;
      const nextIndex = Math.min(FONT_STEPS.length - 1, Math.max(0, base + direction));
      return { ...prev, fontScale: FONT_STEPS[nextIndex] };
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULTS);
  }, []);

  // Apply preferences to the document, persist them, and notify subscribers —
  // only after commit, never during render. Runs on mount (re-applying what the
  // blocking init script already set, idempotently) and on every change.
  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const skipToMain = useCallback(() => {
    close();
    const main = document.getElementById('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus();
      main.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, [close]);

  // Escape to close, focus trap, and initial focus while open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const focusable = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => !node.hasAttribute('disabled'));

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusable();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    // Focus the first control once the panel is painted.
    const raf = requestAnimationFrame(() => focusable()[0]?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="פתיחת תפריט נגישות"
        aria-expanded={open}
        // Physical bottom-LEFT corner: in RTL the inline-END is the left edge.
        className="fixed bottom-5 end-5 z-70 grid h-13 w-13 place-items-center rounded-full border border-gold/40 bg-ink/90 text-gold shadow-lg shadow-black/40 backdrop-blur-sm transition-colors hover:border-gold hover:text-cream focus-visible:border-gold"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Accessibility className="h-6 w-6" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-90">
          <button
            type="button"
            aria-label="סגירת תפריט הנגישות"
            tabIndex={-1}
            onClick={close}
            className="absolute inset-0 bg-ink/70 backdrop-blur-sm"
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute bottom-0 end-0 flex max-h-[88svh] w-[min(23rem,92vw)] flex-col overflow-y-auto rounded-t-xl border border-gold/25 bg-charcoal p-5 shadow-2xl sm:bottom-5 sm:end-5 sm:rounded-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id={titleId} className="text-lg font-bold text-ivory">
                אפשרויות נגישות
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="סגירה"
                className="grid h-9 w-9 place-items-center rounded-sm text-cream hover:text-ivory focus-visible:text-ivory"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Text size */}
            <div className="mt-5 rounded-lg border border-gold/15 bg-ink/40 p-3">
              <p className="text-sm font-medium text-cream">גודל טקסט</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stepFont(-1)}
                  disabled={settings.fontScale <= FONT_STEPS[0]}
                  aria-label="הקטנת טקסט"
                  className="grid h-11 flex-1 place-items-center rounded-sm border border-gold/25 text-cream transition-colors hover:border-gold hover:text-ivory disabled:opacity-40"
                >
                  <Minus className="h-5 w-5" aria-hidden="true" />
                </button>
                <span className="ltr-nums w-14 text-center text-sm text-muted" aria-live="polite">
                  {settings.fontScale}%
                </span>
                <button
                  type="button"
                  onClick={() => stepFont(1)}
                  disabled={settings.fontScale >= FONT_STEPS[FONT_STEPS.length - 1]}
                  aria-label="הגדלת טקסט"
                  className="grid h-11 flex-1 place-items-center rounded-sm border border-gold/25 text-cream transition-colors hover:border-gold hover:text-ivory disabled:opacity-40"
                >
                  <Plus className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="mt-3 flex flex-col gap-2">
              <Toggle
                icon={Contrast}
                labelHe="ניגודיות גבוהה"
                pressed={settings.contrast}
                onToggle={() => update({ contrast: !settings.contrast })}
              />
              <Toggle
                icon={Link2}
                labelHe="הדגשת קישורים"
                pressed={settings.links}
                onToggle={() => update({ links: !settings.links })}
              />
              <Toggle
                icon={PauseCircle}
                labelHe="עצירת אנימציות"
                pressed={settings.stopMotion}
                onToggle={() => update({ stopMotion: !settings.stopMotion })}
              />
              <Toggle
                icon={Type}
                labelHe="גופן קריא"
                pressed={settings.readable}
                onToggle={() => update({ readable: !settings.readable })}
              />
            </div>

            {/* Actions */}
            <div className="mt-4 flex flex-col gap-2 border-t border-gold/15 pt-4">
              <button
                type="button"
                onClick={skipToMain}
                className="inline-flex h-11 items-center gap-3 rounded-sm px-3 text-sm text-cream transition-colors hover:bg-ink/50 hover:text-ivory"
              >
                <ArrowDownToLine className="h-5 w-5 text-gold" aria-hidden="true" />
                מעבר לתוכן הראשי
              </button>
              <Link
                href="/accessibility"
                onClick={close}
                className="inline-flex h-11 items-center gap-3 rounded-sm px-3 text-sm text-cream transition-colors hover:bg-ink/50 hover:text-ivory"
              >
                <FileText className="h-5 w-5 text-gold" aria-hidden="true" />
                הצהרת נגישות
              </Link>
              <button
                type="button"
                onClick={reset}
                className="inline-flex h-11 items-center gap-3 rounded-sm px-3 text-sm text-cream transition-colors hover:bg-ink/50 hover:text-ivory"
              >
                <RotateCcw className="h-5 w-5 text-gold" aria-hidden="true" />
                איפוס הגדרות
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Toggle({
  icon: Icon,
  labelHe,
  pressed,
  onToggle,
}: {
  icon: typeof Contrast;
  labelHe: string;
  pressed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onToggle}
      className="flex h-12 items-center justify-between gap-3 rounded-sm border border-gold/15 bg-ink/40 px-3 text-sm text-cream transition-colors hover:border-gold/40 focus-visible:border-gold aria-pressed:border-gold/60 aria-pressed:bg-gold/10 aria-pressed:text-ivory"
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gold" aria-hidden="true" />
        {labelHe}
      </span>
      {/* A real switch track so state is visible, not only announced.
          Knob position uses logical `start-*` so it slides toward the inline-end
          (left in Hebrew) when on. */}
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 shrink-0 rounded-full border transition-colors ${
          pressed ? 'border-gold bg-gold/70' : 'border-gold/30 bg-ink'
        }`}
      >
        <span
          className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all duration-200 ${
            pressed ? 'start-[1.25rem] bg-ink' : 'start-0.5 bg-gold/70'
          }`}
        />
      </span>
    </button>
  );
}
