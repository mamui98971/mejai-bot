interface ProgressBarProps {
  label: string;
  current: number;
  max: number;
  unit: string;
  color?: string; // CSS variable or hex
  isWarning?: boolean;
}

export function ProgressBar({ label, current, max, unit, color = 'var(--primary)', isWarning = false }: ProgressBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  
  const barColor = isWarning && current > max ? 'var(--warning-red)' : color;
  
  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className={`progress-value ${isWarning && current > max ? 'warning-text' : ''}`}>
          {current} / {max} {unit}
        </span>
      </div>
      <div className="progress-track">
        <div 
          className="progress-fill" 
          style={{ 
            width: `${percentage}%`,
            backgroundColor: barColor,
            boxShadow: `0 0 10px ${barColor}`
          }}
        />
      </div>
    </div>
  );
}
