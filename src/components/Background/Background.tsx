import { useEffect, useRef, useState } from 'react';
import { useBackground } from '../../contexts/BackgroundContext';
import './Background.css';

// Extracts the quoted url("...") from a CSS `background` shorthand value, if present.
function extractUrl(css: string): string | null {
  const match = css.match(/url\(["']?([^"')]+)["']?\)/);
  return match ? match[1] : null;
}

// Dual-layer cross-fade (Tabliss-style double buffer): two absolutely-stacked
// layers hold the current and incoming background CSS; swapping which one is
// "active" (opacity 1) drives the fade via the shared .sg-bg-layer transition.
// Image-backed values are preloaded through a detached Image() before the
// swap so the fade never reveals a half-loaded/blank frame; solid colors and
// gradients need no preload and swap immediately.
function useCrossfadeBackground(backgroundCss: string) {
  const [layers, setLayers] = useState<[string, string]>([backgroundCss, backgroundCss]);
  const [active, setActive] = useState<0 | 1>(0);
  const lastCss = useRef(backgroundCss);

  useEffect(() => {
    if (backgroundCss === lastCss.current) return;
    lastCss.current = backgroundCss;
    const nextIndex: 0 | 1 = active === 0 ? 1 : 0;

    const swap = () => {
      setLayers(prev => {
        const copy = [...prev] as [string, string];
        copy[nextIndex] = backgroundCss;
        return copy;
      });
      setActive(nextIndex);
    };

    const url = extractUrl(backgroundCss);
    if (!url) { swap(); return; }

    let cancelled = false;
    const img = new Image();
    img.onload  = () => { if (!cancelled) swap(); };
    img.onerror = () => { if (!cancelled) swap(); }; // fall back to an instant swap rather than getting stuck
    img.src = url;
    return () => { cancelled = true; };
  }, [backgroundCss, active]);

  return { layers, active };
}

export default function Background() {
  const { backgroundCss, config, unsplash } = useBackground();
  const { layers, active } = useCrossfadeBackground(backgroundCss);

  const dimAmount   = config.dimAmount ?? 0;
  const isFit       = config.mode === 'custom' && (config.scalingMode ?? 'fit') === 'fit';
  const letterboxBg = config.mode === 'custom' ? (config.letterboxColor ?? '#000000') : '#000000';

  const showAttribution =
    config.mode === 'unsplash' &&
    (config.showAttribution ?? true) &&
    !!unsplash.attribution;

  return (
    <>
      {isFit && (
        <div className="sg-background-letterbox" style={{ background: letterboxBg }} />
      )}
      <div className={`sg-bg-layer${active === 0 ? ' sg-bg-layer--active' : ''}`} style={{ background: layers[0] }} />
      <div className={`sg-bg-layer${active === 1 ? ' sg-bg-layer--active' : ''}`} style={{ background: layers[1] }} />
      {dimAmount > 0 && (
        <div className="sg-background-dim" style={{ opacity: dimAmount }} />
      )}
      {showAttribution && unsplash.attribution && (
        <div className="sg-bg-attribution">
          Photo by{' '}
          <a
            href={unsplash.attribution.photographerUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {unsplash.attribution.photographerName}
          </a>
          {' '}on{' '}
          <a
            href={`https://unsplash.com?utm_source=startgrid&utm_medium=referral`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Unsplash
          </a>
        </div>
      )}
    </>
  );
}
