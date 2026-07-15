import { useBackground } from '../../contexts/BackgroundContext';
import './Background.css';

export default function Background() {
  const { backgroundCss, config, unsplash } = useBackground();

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
      <div className="sg-background" style={{ background: backgroundCss }} />
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
