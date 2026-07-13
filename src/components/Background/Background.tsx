import { useBackground } from '../../contexts/BackgroundContext';
import './Background.css';

export default function Background() {
  const { backgroundCss } = useBackground();
  return <div className="sg-background" style={{ background: backgroundCss }} />;
}
