import React, { useState, useEffect } from 'react';
import { ForensicCase, BackendHealth } from '../types';
import { FORENSIC_CASES } from '../data/cases';
import { HeroEmblemNetwork } from './HeroEmblemNetwork';
import {
  Shield,
  Search,
  FolderOpen,
  ArrowRight,
  Play,
  AlertCircle,
  FileCheck,
  Building2,
  Database,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { api } from '../api/client';

interface HomeScreenProps {
  onExecuteTrace: (
    address: string,
    chain: string,
    complaintId?: string,
    maxHops?: number,
    stopAtVasp?: boolean
  ) => void;
  onSelectCase: (c: ForensicCase) => void;
  onOpenRecentTraces?: () => void;
  onOpenVaspDirectory?: () => void;
  hasActiveSession?: boolean;
  activeCase?: ForensicCase;
  onReturnToDashboard?: () => void;
}

export function HomeScreen({
  onExecuteTrace,
  onSelectCase,
  onOpenRecentTraces,
  onOpenVaspDirectory,
  hasActiveSession,
  activeCase,
  onReturnToDashboard,
}: HomeScreenProps) {
  const [address, setAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<'Ethereum (ETH)' | 'Polygon (POL)'>('Ethereum (ETH)');
  const [complaintId, setComplaintId] = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(FORENSIC_CASES[0].id);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [maxHops, setMaxHops] = useState<number>(15);
  const [stopAtVasp, setStopAtVasp] = useState<boolean>(true);
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    api
      .checkHealth()
      .then((res) => {
        if (mounted) {
          setHealth(res);
          setApiOnline(res?.status === 'ok');
        }
      })
      .catch(() => {
        if (mounted) setApiOnline(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleTraceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddr = address.trim();

    if (!cleanAddr) {
      setValidationError('Please enter a target suspect wallet address.');
      return;
    }

    if (!cleanAddr.startsWith('0x') || cleanAddr.length !== 42) {
      setValidationError('Enter a valid 42-character EVM hex address (e.g. 0x...).');
      return;
    }

    setValidationError(null);
    onExecuteTrace(cleanAddr, selectedChain, complaintId.trim() || undefined, maxHops, stopAtVasp);
  };

  const handleLoadPreset = () => {
    const matchedCase = FORENSIC_CASES.find((c) => c.id === selectedPresetId);
    if (matchedCase) {
      onSelectCase(matchedCase);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#131114] text-[#EDE8DE] relative overflow-hidden select-none">
      {/* 1. Minimal Top Header */}
      <header className="border-b border-[#2A272D] bg-[#161418]/90 backdrop-blur-sm px-6 py-3.5 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#B8935F]/40 bg-[#1C1A1E] text-[#B8935F] shadow-sm">
              <Shield className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg tracking-tight font-semibold text-[#EDE8DE]">
                  TraceX
                </span>
                <span className="text-[11px] font-normal text-[#A8A399] border-l border-[#2E2B32] pl-2">
                  I4C Cyber Forensics Desk
                </span>
              </div>
              <p className="text-[11px] text-[#7E7972] leading-none">
                Ministry of Home Affairs • Government of India
              </p>
            </div>
          </div>

          {/* Quick Header Actions: API Health, DB Traces, VASP Directory */}
          <div className="flex items-center gap-3">
            {/* Live API Badge */}
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border font-mono ${
                apiOnline
                  ? 'bg-[#3B6B54]/10 border-[#3B6B54]/30 text-[#3B6B54]'
                  : 'bg-amber-950/20 border-amber-800/40 text-amber-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  apiOnline ? 'bg-[#3B6B54] animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{apiOnline ? `Backend v${health?.version || '1.0.0'} Online` : 'Simulation Mode'}</span>
            </div>

            {onOpenRecentTraces && (
              <button
                onClick={onOpenRecentTraces}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] hover:border-[#B8935F]/40 text-xs text-[#A8A399] hover:text-[#EDE8DE] transition-colors"
                title="Open recent traces recorded in database"
              >
                <Database className="h-3.5 w-3.5 text-[#B8935F]" />
                <span>DB Traces Archive</span>
              </button>
            )}

            {onOpenVaspDirectory && (
              <button
                onClick={onOpenVaspDirectory}
                className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] hover:border-[#B8935F]/40 text-xs text-[#A8A399] hover:text-[#EDE8DE] transition-colors"
                title="Browse 549 verified exchanges and flagged labels"
              >
                <Building2 className="h-3.5 w-3.5 text-[#B8935F]" />
                <span>VASP Directory</span>
              </button>
            )}

            {/* Return to active session if mid-session */}
            {hasActiveSession && onReturnToDashboard && activeCase && (
              <button
                onClick={onReturnToDashboard}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded border border-[#B8935F]/40 bg-[#1C1A1E] hover:bg-[#252228] text-xs font-medium text-[#B8935F] transition-all shadow-sm"
                title="Return to currently loaded investigation"
              >
                <span>Return to Case ({activeCase.ncrpDocketNumber})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Stage with Ashoka Emblem Node-Network Background */}
      <main className="flex-1 flex items-center justify-center px-6 py-10 relative z-10">
        {/* Ashoka Emblem Decorative Constellation Background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          <HeroEmblemNetwork className="w-full max-w-[460px] md:max-w-[500px] lg:max-w-[540px] opacity-40 md:opacity-50 lg:opacity-75 translate-y-2 lg:translate-x-32" />
        </div>

        {/* Foreground Content Card Container */}
        <div className="w-full max-w-2xl relative z-10 space-y-6">
          {/* Editorial Title & Overview */}
          <div className="text-center space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#1C1A1E] border border-[#2E2B32] text-[11px] font-medium text-[#B8935F]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8935F] animate-pulse"></span>
              STATUTORY CYBER FORENSICS • SECTION 91 BNSS / CrPC DIRECTIVES
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-normal text-[#EDE8DE] tracking-tight leading-tight">
              Forensic Fund-Flow Tracing
            </h1>

            <p className="text-xs sm:text-sm text-[#A8A399] max-w-xl mx-auto leading-relaxed">
              Trace on-chain cryptocurrency theft across Ethereum and Polygon networks. Attribute exit endpoints to FIU-registered Indian exchanges, analyze ML behavioral clusters, and export statutory freeze directives.
            </p>
          </div>

          {/* Central Search Input Box */}
          <div className="panel-dossier rounded-lg p-6 border border-[#B8935F]/20 shadow-2xl backdrop-blur-md bg-[#161418]/95 space-y-4">
            <form onSubmit={handleTraceSubmit} className="space-y-3.5">
              {/* Chain Selector Tabs */}
              <div>
                <label className="block text-[11px] text-[#A8A399] mb-1.5 uppercase font-medium tracking-wider">
                  Target Blockchain Network
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedChain('Ethereum (ETH)')}
                    className={`py-2 px-3 rounded text-xs font-medium border transition-colors flex items-center justify-center gap-2 ${
                      selectedChain === 'Ethereum (ETH)'
                        ? 'bg-[#242227] text-[#EDE8DE] border-[#B8935F]'
                        : 'bg-[#18161A] text-[#7E7972] border-[#2A272D] hover:text-[#EDE8DE]'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedChain === 'Ethereum (ETH)' ? 'bg-[#B8935F]' : 'bg-[#7E7972]'
                      }`}
                    ></span>
                    Ethereum (ETH Mainnet)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedChain('Polygon (POL)')}
                    className={`py-2 px-3 rounded text-xs font-medium border transition-colors flex items-center justify-center gap-2 ${
                      selectedChain === 'Polygon (POL)'
                        ? 'bg-[#242227] text-[#EDE8DE] border-[#B8935F]'
                        : 'bg-[#18161A] text-[#7E7972] border-[#2A272D] hover:text-[#EDE8DE]'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        selectedChain === 'Polygon (POL)' ? 'bg-[#B8935F]' : 'bg-[#7E7972]'
                      }`}
                    ></span>
                    Polygon (POL / PoS)
                  </button>
                </div>
              </div>

              {/* Wallet Address Input */}
              <div>
                <label htmlFor="home-wallet-address" className="block text-xs font-medium text-[#EDE8DE] mb-1.5">
                  Suspect / Victim Wallet Address (0x...)
                </label>
                <div className="relative">
                  <input
                    id="home-wallet-address"
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="0x... (e.g. Euler Exploit, Kyber, or any EVM address)"
                    className="w-full rounded border border-[#2E2B32] bg-[#1C1A1E] px-3.5 py-2.5 text-xs text-[#EDE8DE] font-mono placeholder-[#7E7972] focus:border-[#B8935F] focus:outline-none transition-colors"
                  />
                  <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-[#7E7972]" />
                </div>
                {validationError && (
                  <p className="mt-1 text-[11px] text-[#8C3B3B] flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {validationError}
                  </p>
                )}
              </div>

              {/* FIR / Docket Reference (Optional) */}
              <div>
                <label htmlFor="home-complaint-id" className="block text-[11px] text-[#A8A399] mb-1.5">
                  Police FIR / NCRP Complaint Docket Number <span className="text-[#7E7972]">(Optional)</span>
                </label>
                <input
                  id="home-complaint-id"
                  type="text"
                  value={complaintId}
                  onChange={(e) => setComplaintId(e.target.value)}
                  placeholder="e.g. NCRP/2024/77812 or FIR 308/2024"
                  className="w-full rounded border border-[#2E2B32] bg-[#1C1A1E] px-3.5 py-2 text-xs text-[#EDE8DE] placeholder-[#7E7972] focus:border-[#B8935F] focus:outline-none transition-colors"
                />
              </div>

              {/* Advanced Parameters Accordion (Backend BFS settings) */}
              <div className="rounded border border-[#262429] bg-[#141215] overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-3 py-2 text-[11px] text-[#A8A399] hover:text-[#EDE8DE] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Sliders className="h-3 w-3 text-[#B8935F]" />
                    <span>Advanced Forensics Parameters (BFS Engine)</span>
                  </div>
                  {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showAdvanced && (
                  <div className="p-3 border-t border-[#262429] space-y-3 bg-[#18161A] text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[#EDE8DE] block font-medium">Max BFS Hop Depth: {maxHops}</span>
                        <span className="text-[10px] text-[#7E7972]">Max recursive transaction tiers to trace</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={maxHops}
                        onChange={(e) => setMaxHops(parseInt(e.target.value))}
                        className="w-32 accent-[#B8935F] cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#242227]">
                      <div>
                        <span className="text-[#EDE8DE] block font-medium">Stop Traversal at VASP / Exchange</span>
                        <span className="text-[10px] text-[#7E7972]">Terminate branch recursion upon KYC deposit endpoint</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={stopAtVasp}
                        onChange={(e) => setStopAtVasp(e.target.checked)}
                        className="h-4 w-4 accent-[#B8935F] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Run Trace CTA */}
              <button
                type="submit"
                className="w-full rounded bg-[#B8935F] py-3 px-4 text-xs font-semibold text-[#131114] hover:bg-[#CFAC78] transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Run Forensic Trace & Generate Graph</span>
              </button>
            </form>

            {/* Benchmark Preset Selector Divider */}
            <div className="relative pt-3 pb-1 border-t border-[#242227]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-[#A8A399]">Or load benchmark police cases:</span>
                <span className="text-[10px] text-[#B8935F] font-mono">FIU-IND Verified</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    value={selectedPresetId}
                    onChange={(e) => setSelectedPresetId(e.target.value)}
                    className="w-full appearance-none rounded border border-[#2E2B32] bg-[#1C1A1E] px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B8935F] focus:outline-none pr-8 cursor-pointer"
                  >
                    {FORENSIC_CASES.map((c) => (
                      <option key={c.id} value={c.id} className="bg-[#1C1A1E] text-[#EDE8DE]">
                        {c.ncrpDocketNumber} — {c.crimeCategory.slice(0, 34)}...
                      </option>
                    ))}
                  </select>
                  <FolderOpen className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#B8935F]" />
                </div>
                <button
                  type="button"
                  onClick={handleLoadPreset}
                  className="px-3 py-2 rounded bg-[#242227] hover:bg-[#2F2B33] text-xs text-[#EDE8DE] border border-[#3A363E] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Load Preset</span>
                  <ArrowRight className="h-3 w-3 text-[#B8935F]" />
                </button>
              </div>

              {/* Direct Link to DB Traces and VASP Directory */}
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#242227] text-xs">
                {onOpenRecentTraces && (
                  <button
                    type="button"
                    onClick={onOpenRecentTraces}
                    className="text-[#B8935F] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Database className="h-3 w-3" />
                    <span>View 35 Database Traces</span>
                  </button>
                )}

                {onOpenVaspDirectory && (
                  <button
                    type="button"
                    onClick={onOpenVaspDirectory}
                    className="text-[#A8A399] hover:text-[#EDE8DE] hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Building2 className="h-3 w-3 text-[#B8935F]" />
                    <span>Explore 549 VASP Labels</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Statutory badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] text-[#7E7972] pt-1">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-[#B8935F]" />
              <span>Section 91 BNSS Directives</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileCheck className="h-3.5 w-3.5 text-[#3B6B54]" />
              <span>FIU-IND Registered VASPs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-[#B8935F]" />
              <span>Law Enforcement Authenticated</span>
            </div>
          </div>
        </div>
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-[#2A272D] bg-[#141215] px-6 py-3 text-center text-[11px] text-[#7E7972] z-20">
        Indian Cyber Crime Coordination Centre (I4C) • Ministry of Home Affairs • Digital Asset Forensic Intelligence
      </footer>
    </div>
  );
}
