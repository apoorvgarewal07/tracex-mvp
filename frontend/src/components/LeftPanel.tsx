import React, { useState } from 'react';
import { ForensicCase } from '../types';
import { FORENSIC_CASES } from '../data/cases';
import {
  Search,
  FolderOpen,
  User,
  ShieldAlert,
  CornerDownRight,
  Check,
  Loader2,
  AlertCircle,
  Database,
  Building2,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface LeftPanelProps {
  currentCase: ForensicCase;
  isExecuting?: boolean;
  onSelectCase: (caseItem: ForensicCase) => void;
  onExecuteTrace: (
    address: string,
    chain: string,
    complaintId?: string,
    maxHops?: number,
    stopAtVasp?: boolean
  ) => void;
  onResetTrace: () => void;
  onOpenRecentTraces?: () => void;
  onOpenVaspDirectory?: () => void;
}

export function LeftPanel({
  currentCase,
  isExecuting = false,
  onSelectCase,
  onExecuteTrace,
  onResetTrace,
  onOpenRecentTraces,
  onOpenVaspDirectory,
}: LeftPanelProps) {
  const [inputAddress, setInputAddress] = useState(currentCase.targetWallet);
  const [selectedChain, setSelectedChain] = useState<string>(currentCase.chain || 'Ethereum (ETH)');
  const [complaintId, setComplaintId] = useState<string>(currentCase.ncrpDocketNumber || '');
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxHops, setMaxHops] = useState(15);
  const [stopAtVasp, setStopAtVasp] = useState(true);

  const handleCaseChange = (caseId: string) => {
    const found = FORENSIC_CASES.find((c) => c.id === caseId);
    if (found) {
      onSelectCase(found);
      setInputAddress(found.targetWallet);
      setSelectedChain(found.chain);
      setComplaintId(found.ncrpDocketNumber);
      setValidationError(null);
      onResetTrace();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAddr = inputAddress.trim().toLowerCase();

    // Validate EVM format for real backend trace
    if (!cleanAddr.match(/^0x[a-f0-9]{40}$/i)) {
      setValidationError('Invalid EVM address. Must start with 0x followed by 40 hex characters.');
      return;
    }

    setValidationError(null);
    onExecuteTrace(
      cleanAddr,
      selectedChain.includes('Polygon') ? 'POLYGON' : 'ETH',
      complaintId.trim(),
      maxHops,
      stopAtVasp
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[#2A272D] bg-[#161418] overflow-y-auto">
      {/* Investigation Dossier Heading */}
      <div className="p-5 border-b border-[#2A272D]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-[#B8935F] tracking-wide">
            Investigation Dossier
          </span>
          <span className="text-[11px] text-[#A8A399] bg-[#1C1A1E] px-2 py-0.5 rounded border border-[#2E2B32]">
            Prototype Mode
          </span>
        </div>
        <h1 className="font-serif text-xl font-normal text-[#EDE8DE] leading-snug">
          Case Brief & Target
        </h1>
        <p className="mt-1 text-xs text-[#A8A399] leading-relaxed">
          Forensic tracing analysis prototype under Section 91 BNSS / CrPC framework.
        </p>

        {/* Case Preset Selector */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="case-record-select" className="block text-[11px] text-[#A8A399] font-normal">
              Benchmark Presets:
            </label>
            {onOpenRecentTraces && (
              <button
                type="button"
                onClick={onOpenRecentTraces}
                className="text-[10px] text-[#B8935F] hover:underline flex items-center gap-1 font-mono"
              >
                <Database className="h-3 w-3" />
                <span>35 DB Traces</span>
              </button>
            )}
          </div>
          <div className="relative">
            <select
              id="case-record-select"
              value={currentCase.id}
              onChange={(e) => handleCaseChange(e.target.value)}
              className="w-full appearance-none rounded border border-[#2E2B32] bg-[#1C1A1E] px-3 py-2 text-xs text-[#EDE8DE] focus:border-[#B8935F] focus:outline-none pr-8 cursor-pointer"
            >
              {FORENSIC_CASES.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1C1A1E] text-[#EDE8DE]">
                  {c.ncrpDocketNumber} — {c.crimeCategory.slice(0, 26)}...
                </option>
              ))}
            </select>
            <FolderOpen className="pointer-events-none absolute right-2.5 top-2.5 h-3.5 w-3.5 text-[#B8935F]" />
          </div>
        </div>
      </div>

      {/* Target Address Input Section */}
      <div className="p-5 border-b border-[#2A272D] bg-[#18161A]/70">
        <form onSubmit={handleSearchSubmit}>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="wallet-address-input" className="text-xs text-[#EDE8DE] font-medium">
              Target Wallet Address (0x...)
            </label>
            {onOpenVaspDirectory && (
              <button
                type="button"
                onClick={onOpenVaspDirectory}
                className="text-[10px] text-[#A8A399] hover:text-[#B8935F] flex items-center gap-1"
                title="Browse verified addresses from directory"
              >
                <Building2 className="h-3 w-3" />
                <span>Lookup Directory</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                id="wallet-address-input"
                type="text"
                value={inputAddress}
                onChange={(e) => {
                  setInputAddress(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="0x... (EVM address)"
                className={`w-full rounded border ${
                  validationError ? 'border-rose-500' : 'border-[#2E2B32]'
                } bg-[#1C1A1E] px-3 py-2 text-xs text-[#EDE8DE] font-mono placeholder-[#7E7972] focus:border-[#B8935F] focus:outline-none transition-colors`}
              />
              <button
                type="button"
                onClick={() => handleCopy(inputAddress)}
                className="absolute right-2 top-2 text-[10px] text-[#A8A399] hover:text-[#EDE8DE] px-1.5 py-0.5 rounded bg-[#242227]"
              >
                {copied ? <Check className="h-3 w-3 text-[#3B6B54]" /> : 'Copy'}
              </button>
            </div>

            {validationError && (
              <div className="text-[11px] text-rose-400 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <select
                  value={selectedChain}
                  onChange={(e) => setSelectedChain(e.target.value)}
                  className="w-full rounded border border-[#2E2B32] bg-[#1C1A1E] px-2 py-1.5 text-xs text-[#EDE8DE] focus:border-[#B8935F] focus:outline-none cursor-pointer"
                >
                  <option value="Ethereum (ETH)">Ethereum (ETH)</option>
                  <option value="Polygon (POL)">Polygon (POL)</option>
                </select>
              </div>
              <button
                type="submit"
                id="search-address-btn"
                disabled={isExecuting || !inputAddress.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded border border-[#B8935F]/40 bg-[#242126] px-3 py-1.5 text-xs font-medium text-[#EDE8DE] hover:bg-[#B8935F]/20 hover:border-[#B8935F] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-[#B8935F]" />
                    <span>Tracing...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-3 w-3 text-[#B8935F]" />
                    <span>Run Trace</span>
                  </>
                )}
              </button>
            </div>

            {/* Advanced BFS parameters expandable */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-[#7E7972] hover:text-[#A8A399] flex items-center justify-between w-full py-1"
              >
                <span className="flex items-center gap-1">
                  <Sliders className="h-3 w-3 text-[#B8935F]" />
                  <span>Trace Options (Hops: {maxHops}, Stop at VASP: {stopAtVasp ? 'Yes' : 'No'})</span>
                </span>
                {showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showAdvanced && (
                <div className="p-2.5 rounded bg-[#141215] border border-[#262429] space-y-2 mt-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#A8A399]">Max Depth: {maxHops}</span>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={maxHops}
                      onChange={(e) => setMaxHops(parseInt(e.target.value))}
                      className="w-24 accent-[#B8935F] cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-[#222] pt-1.5">
                    <span className="text-[11px] text-[#A8A399]">Halt on VASP:</span>
                    <input
                      type="checkbox"
                      checked={stopAtVasp}
                      onChange={(e) => setStopAtVasp(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[#B8935F] rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Case Dossier Facts */}
      <div className="p-5 flex-1 space-y-4">
        {/* Victim / Complainant Details */}
        <div className="panel-dossier rounded p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs pb-1 border-b border-[#2A272D]">
            <span className="text-[#A8A399] flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-[#B8935F]" />
              Complainant
            </span>
            <span className="text-[#EDE8DE] font-medium">{currentCase.complainantName}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-[#A8A399]">Loss Amount</span>
            <div className="text-right">
              <div className="text-sm font-semibold text-[#EDE8DE]">{currentCase.stolenAmountINR}</div>
              <div className="text-[11px] text-[#B8935F]">{currentCase.stolenAmountCrypto}</div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#2A272D]">
            <span className="text-[#A8A399]">Category</span>
            <span className="text-xs text-[#EDE8DE] text-right font-medium max-w-[180px] truncate">
              {currentCase.crimeCategory}
            </span>
          </div>
        </div>

        {/* Investigating Officer & Police Station */}
        <div className="panel-dossier-subtle rounded p-3.5 space-y-2">
          <div className="text-[11px] text-[#B8935F] font-medium flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Jurisdictional Authority
          </div>
          <div className="text-xs font-medium text-[#EDE8DE]">
            {currentCase.investigatingOfficer}
          </div>
          <div className="text-[11px] text-[#A8A399] leading-tight">
            {currentCase.rank} (Badge: {currentCase.badgeNumber})
          </div>
          <div className="text-[11px] text-[#7E7972] border-t border-[#242227] pt-1.5 leading-snug">
            {currentCase.policeStation}
          </div>
        </div>

        {/* Chain of Custody / Investigation Notes */}
        <div>
          <div className="text-[11px] font-medium text-[#A8A399] mb-2 flex items-center gap-1">
            <CornerDownRight className="h-3 w-3 text-[#B8935F]" />
            Evidence Notes & Directives
          </div>
          <div className="space-y-2">
            {currentCase.investigatorNotes.map((note, idx) => (
              <div
                key={idx}
                className="text-[11px] text-[#A8A399] bg-[#1A181C] p-2.5 rounded border border-[#2A272D]/60 leading-relaxed"
              >
                <span className="text-[#B8935F] font-medium mr-1.5">§{idx + 1}.</span>
                {note}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-[#2A272D] text-center text-[10px] text-[#7E7972] bg-[#141215]">
        Forensic Prototype Dossier — Research & Demonstration Use
      </div>
    </aside>
  );
}
