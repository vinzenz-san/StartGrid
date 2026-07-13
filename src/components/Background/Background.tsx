import { useBackground } from '../../contexts/BackgroundContext';
import './Background.css';

export default function Background() {
  const { backgroundCss, config } = useBackground();
  const dimAmount = config.dimAmount ?? 0;
  const isFit = config.mode === 'custom' && (config.scalingMode ?? 'fit') === 'fit';

  return (
    <>
      {/* Letterbox color layer — sits behind the image in fit mode */}
      {isFit && (
        <div
          className="sg-background-letterbox"
          style={{ background: config.letterboxColor ?? '#000000' }}
        />
      )}
      <div className="sg-background" style={{ background: backgroundCss }} />
      {dimAmount > 0 && (
        <div className="sg-background-dim" style={{ opacity: dimAmount }} />
      )}
    </>
  );
}
