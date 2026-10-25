import React, { useState, useEffect } from 'react';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { DecisionView } from './pages/DecisionView';
import { AccuracyView } from './pages/AccuracyView';
import { Methodology } from './pages/Methodology';
import { api } from './api/client';
import type { MetaResponse } from './types/api';
import { ShieldCheck, Wind, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('decision');
  const [metadata, setMetadata] = useState<MetaResponse | null>(null);

  useEffect(() => {
    api
      .getMetadata()
      .then((data) => setMetadata(data))
      .catch((err) => console.error('Failed to load dataset metadata:', err));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#07090e] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        metadata={metadata}
      />

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'decision' && <DecisionView />}
        {activeTab === 'accuracy' && <AccuracyView />}
        {activeTab === 'methodology' && <Methodology metadata={metadata} />}
      </main>

      {/* Institutional Trading Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">
              UK National Wind Forecast Monitoring & Decision Portal
            </span>
            <span className="text-slate-600">|</span>
            <span>January 2026 Full Month Outturn</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Leave-One-Day-Out Cross Validation</span>
            </div>
            <a
              href="https://data.elexon.co.uk/bmrs/api/v1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-400 transition-colors hover:text-cyan-400"
            >
              <span>Elexon BMRS Source</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
