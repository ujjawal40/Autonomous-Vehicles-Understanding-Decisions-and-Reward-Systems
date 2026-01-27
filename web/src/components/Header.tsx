interface HeaderProps {
  isLive: boolean;
  isRecording: boolean;
  episodeNumber: number;
  stepNumber: number;
}

export function Header({ isLive, isRecording, episodeNumber, stepNumber }: HeaderProps) {
  return (
    <header className="h-14 bg-space-900/90 backdrop-blur-md border-b border-space-700/50 flex items-center justify-between px-6">
      {/* Logo and Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyber-blue to-cyber-cyan flex items-center justify-center">
            <svg className="w-5 h-5 text-space-950" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">
            <span className="text-white">Autonomous</span>
            <span className="text-cyber-blue ml-1">Decision Visualizer</span>
          </span>
        </div>
      </div>

      {/* Center Stats */}
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center">
          <span className="data-label">Episode</span>
          <span className="data-value text-white">{episodeNumber}</span>
        </div>
        <div className="w-px h-8 bg-space-700" />
        <div className="flex flex-col items-center">
          <span className="data-label">Step</span>
          <span className="data-value text-cyber-cyan">{stepNumber}</span>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4">
        {/* Live Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-space-800/80 border border-space-700/50">
          <div className={`status-indicator ${isLive ? 'status-live' : 'bg-gray-600'}`} />
          <span className={`font-mono text-xs uppercase tracking-wider ${isLive ? 'text-cyber-green' : 'text-gray-500'}`}>
            {isLive ? 'Live' : 'Offline'}
          </span>
        </div>

        {/* Recording Indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-space-800/80 border border-cyber-red/30">
            <div className="status-indicator status-danger" />
            <span className="font-mono text-xs uppercase tracking-wider text-cyber-red">
              Rec
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
