import React, { useState, useEffect } from 'react';
import { Navbar, type NavTab } from './components/layout/Navbar';
import { DecisionView } from './pages/DecisionView';
import { AccuracyView } from './pages/AccuracyView';
import { Methodology } from './pages/Methodology';
import { api } from './api/client';
import type { MetaResponse } from './types/api';
import { WindField } from './components/common/WindField';
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
    <div className="flex min-h-screen flex-col bg-[#F4F6F8] text-slate-100 selection:bg-sky-500/20 selection:text-sky-200">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        metadata={metadata}
      />

      {/* Hero Card */}
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
        <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-[#0E1B26] shadow-sm">
          <div className="absolute inset-0 opacity-70 pointer-events-none"><WindField /></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0E1B26] via-[#0E1B26]/75 to-transparent pointer-events-none" />
          <div className="relative px-6 py-8 sm:px-8 sm:py-10">
            <h1 className="max-w-2xl text-2xl font-semibold leading-tight text-white sm:text-4xl">
              What will wind deliver tomorrow, and how wrong could the forecast be?
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
              The latest Elexon wind forecast available at your day-ahead cut-off, with measured error, so you can size how much to buy elsewhere.
            </p>
          </div>
        </section>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        {activeTab === 'decision' && <DecisionView />}
        {activeTab === 'accuracy' && <AccuracyView />}
        {activeTab === 'methodology' && <Methodology metadata={metadata} />}
      </main>

      {/* Institutional Trading Footer */}
      <footer className="border-t border-slate-800/60 bg-[#F3F6F8]/80 py-5 text-xs text-slate-500 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Wind className="h-3.5 w-3.5" />
            </div>
            <span className="font-semibold text-slate-300">
              UK National Wind Forecast Monitoring & Imbalance Risk Portal
            </span>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400">January 2026 Outturn Analysis</span>
          </div>

          <div className="flex items-center gap-5 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Leave-One-Day-Out (LODO) Verified</span>
            </div>
            <a
              href="https://data.elexon.co.uk/bmrs/api/v1"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-slate-400 transition-colors hover:text-sky-400"
            >
              <span>Elexon BMRS API</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
