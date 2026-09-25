import { useState, useEffect } from 'react';
import { Shield, FileText, Download, CheckCircle2, Clock, Plus, Database, Building2, Activity } from 'lucide-react';
import { ForensicCase, BackendHealth } from '../types';
import { api } from '../api/client';

interface HeaderProps {
  currentCase: ForensicCase;
  onOpenNotice: () => void;
  onOpenExport: () => void;
  onOpenRecentTraces?: () => void;
  onOpenVaspDirectory?: () => void;
  onNavigateHome?: () => void;
}

export function Header({
  currentCase,
  onOpenNotice,
  onOpenExport,
  onOpenRecentTraces,
  onOpenVaspDirectory,
  onNavigateHome,
}: HeaderProps) {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const checkApi = () => {
      api
        .checkHealth()
        .then((res) => {
          if (isMounted) {
            setHealth(res);
            setApiOnline(res?.status === 'ok');
          }
        })
        .catch(() => {
          if (isMounted) {
            setApiOnline(false);
          }
        });
    };

    checkApi();
    const timer = setInterval(checkApi, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <header className="border-b border-[#2A272D] bg-[#161418] px-6 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Agency & Project Title */}
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-3 ${onNavigateHome ? 'cursor-pointer group' : ''}`}
            onClick={onNavigateHome}
            title={onNavigateHome ? 'Return to Home / Landing screen' : undefined}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#B8935F]/40 bg-[#1C1A1E] text-[#B8935F] group-hover:border-[#B8935F] transition-colors">
              <Shield className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg tracking-normal font-semibold text-[#EDE8DE] group-hover:text-[#B8935F] transition-colors">
                  TraceX
                </span>
                <span className="text-[11px] font-normal text-[#A8A399] tracking-normal border-l border-[#2E2B32] pl-2">
                  I4C Cyber Forensics Desk
                </span>
              </div>
              <p className="text-[11px] text-[#7E7972] leading-none">
                Ministry of Home Affairs, Government of India
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 border-l border-[#2E2B32] pl-4">
            <span className="inline-flex items-center gap-1.5 rounded bg-[#1C1A1E] px-2.5 py-1 text-xs text-[#EDE8DE] border border-[#2E2B32]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8935F]"></span>
              Case File: {currentCase.ncrpDocketNumber}
            </span>
            <span className="text-xs text-[#A8A399]">
              {currentCase.firNumber}
            </span>
          </div>
        </div>

        {/* Center/Right: Live API Health, Fast Access Modals, and Action Directives */}
        <div className="flex items-center gap-2.5">
          {/* Live Backend API Health Status Indicator */}
          <div
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] border font-mono transition-colors ${
              apiOnline
                ? 'bg-[#3B6B54]/10 border-[#3B6B54]/30 text-[#3B6B54]'
                : 'bg-amber-950/20 border-amber-800/40 text-amber-400'
            }`}
            title={
              apiOnline
                ? `FastAPI Backend Online (${health?.service || 'CryptoFraud Trace API'} v${health?.version || '1.0.0'})`
                : 'FastAPI Backend Offline — Operating in Client-Side Simulation Mode'
            }
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline ? 'bg-[#3B6B54] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{apiOnline ? `API v${health?.version || '1.0.0'} Online` : 'API Offline (Demo)'}</span>
          </div>

          {/* Database Traces Archive Drawer Trigger */}
          {onOpenRecentTraces && (
            <button
              onClick={onOpenRecentTraces}
              className="inline-flex items-center gap-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] px-2.5 py-1.5 text-xs text-[#A8A399] hover:text-[#EDE8DE] hover:border-[#B8935F]/40 transition-colors cursor-pointer"
              title="View and load traces saved in database (35 records)"
            >
              <Database className="h-3.5 w-3.5 text-[#B8935F]" />
              <span className="hidden xl:inline">DB Traces</span>
            </button>
          )}

          {/* VASP & Entity Directory Trigger */}
          {onOpenVaspDirectory && (
            <button
              onClick={onOpenVaspDirectory}
              className="inline-flex items-center gap-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] px-2.5 py-1.5 text-xs text-[#A8A399] hover:text-[#EDE8DE] hover:border-[#B8935F]/40 transition-colors cursor-pointer"
              title="Inspect verified Indian VASPs, Exchanges, and Flagged Mixers (549 records)"
            >
              <Building2 className="h-3.5 w-3.5 text-[#B8935F]" />
              <span className="hidden xl:inline">VASP Directory</span>
            </button>
          )}

          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] px-2.5 py-1.5 text-xs text-[#A8A399] hover:text-[#EDE8DE] hover:border-[#B8935F]/40 transition-colors cursor-pointer"
              title="Start a new investigation on home screen"
            >
              <Plus className="h-3.5 w-3.5 text-[#B8935F]" />
              <span className="hidden md:inline">New Case</span>
            </button>
          )}

          <button
            id="export-evidence-brief-btn"
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] px-3 py-1.5 text-xs text-[#EDE8DE] hover:border-[#B8935F]/40 hover:text-[#EDE8DE] transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-[#B8935F]" />
            <span className="hidden sm:inline">Evidence Brief</span>
          </button>

          <button
            id="draft-freeze-notice-header-btn"
            onClick={onOpenNotice}
            className="inline-flex items-center gap-1.5 rounded bg-[#B8935F] px-3.5 py-1.5 text-xs font-medium text-[#131114] hover:bg-[#CFAC78] transition-colors shadow-sm cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Draft Sec. 91 Notice</span>
          </button>
        </div>
      </div>
    </header>
  );
}
