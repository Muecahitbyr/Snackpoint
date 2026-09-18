import { useScrollProgress } from '../hooks/useScrollProgress';
import './ProgressBar.css';

export default function ProgressBar() {
  const { progress } = useScrollProgress();
  return <div className="progress-bar" style={{ width: `${progress}%` }} />;
}
