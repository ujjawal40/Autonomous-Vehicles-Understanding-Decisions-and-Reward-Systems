/**
 * Dashboard Header
 *
 * SpaceX-style minimal header with status and navigation
 */

import { useState } from 'react';
import {
  Activity,
  Settings,
  Moon,
  Sun,
  Github,
  ExternalLink,
  Menu,
  X,
} from 'lucide-react';

interface DashboardHeaderProps {
  isConnected: boolean;
  isTraining: boolean;
  runName?: string;
  onSettingsClick?: () => void;
}

export function DashboardHeader({
  isConnected,
  isTraining,
  runName,
  onSettingsClick,
}: DashboardHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-[--color-void] border-b border-white/5 flex items-center justify-between px-6 relative z-50">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-[--color-cyber-blue] to-[--color-cyber-cyan] flex items-center justify-center">
            <Activity size={18} className="text-black" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white tracking-tight">
              ADV
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">
              Autonomous Decision Visualizer
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-white/10 hidden md:block" />

        {/* Current Run */}
        {runName && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-white/40">Run:</span>
            <span className="text-xs text-mono text-white">{runName}</span>
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-6">
        {/* Connection Status */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`status-dot ${isConnected ? 'status-live' : 'status-idle'}`}
            />
            <span className="text-xs text-white/60">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Training Status */}
          {isTraining && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-[--color-cyber-green]/10 border border-[--color-cyber-green]/30">
              <div className="w-2 h-2 rounded-full bg-[--color-cyber-green] animate-pulse" />
              <span className="text-xs text-[--color-cyber-green] font-medium">
                Training
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <Github size={18} />
          </a>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors"
          >
            <Settings size={18} />
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded hover:bg-white/5 text-white/40 hover:text-white transition-colors md:hidden"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-14 left-0 right-0 bg-[--color-space-900] border-b border-white/5 p-4 md:hidden">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`status-dot ${isConnected ? 'status-live' : 'status-idle'}`}
              />
              <span className="text-sm text-white/60">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>

            {isTraining && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[--color-cyber-green] animate-pulse" />
                <span className="text-sm text-[--color-cyber-green]">
                  Training in progress
                </span>
              </div>
            )}

            {runName && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-white/40">Current run:</span>
                <span className="text-sm text-mono text-white">{runName}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
