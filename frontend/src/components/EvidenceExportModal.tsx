import { useState } from 'react';
import { ForensicCase } from '../types';
import { Shield, Download, FileJson, Check, X, ShieldCheck } from 'lucide-react';

interface EvidenceExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: ForensicCase;
}

export function EvidenceExportModal({
  isOpen,
  onClose,
  currentCase,
}: EvidenceExportModalProps) {
  const [downloadedJson, setDownloadedJson] = useState(false);

  if (!isOpen) return null;

  const handleDownloadJson = () => {
    const data = {
      investigationMetadata: {
        platform: 'TraceX Blockchain Forensics Engine',
        agency: 'Indian Cyber Crime Coordination Centre (I4C)',
        ministry: 'Ministry of Home Affairs, Government of India',
        exportTimestamp: new Date().toISOString(),
        evidenceActCertification: 'Certified under Section 63 / 65B of Bharatiya Sakshya Adhiniyam, 2023',
      },
      caseFile: currentCase,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `TRACEX_FORENSIC_EVIDENCE_${currentCase.ncrpDocketNumber.replace(/\//g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadedJson(true);
    setTimeout(() => setDownloadedJson(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-xl rounded bg-[#1C1A1E] border border-[#B8935F]/40 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A272D] px-6 py-4 bg-[#161418]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#B8935F]/40 bg-[#1C1A1E] text-[#B8935F]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-normal text-[#EDE8DE]">
                Export Forensic Evidence Package
              </h2>
              <p className="text-xs text-[#A8A399]">
                Judicial Chain of Custody & On-Chain Audit Trail
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8A399] hover:text-[#EDE8DE] p-1.5 rounded hover:bg-[#242227]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-[#EDE8DE]">
          <div className="panel-dossier rounded p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#B8935F]">
              <ShieldCheck className="h-4 w-4" />
              Evidence Custody Certificate (BSA 2023 Sec. 63)
            </div>
            <p className="text-[11px] text-[#A8A399] leading-relaxed">
              Export includes complete cryptographic hash verifications, node telemetry, gas fee signatures, time-lapse sequencing, and target exchange deposit identifiers in standard court-admissible formats.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#242227]">
              <span className="text-[#A8A399]">NCRP Reference</span>
              <span className="font-medium text-[#EDE8DE]">{currentCase.ncrpDocketNumber}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#242227]">
              <span className="text-[#A8A399]">FIR Crime Reference</span>
              <span className="font-medium text-[#EDE8DE]">{currentCase.firNumber}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#242227]">
              <span className="text-[#A8A399]">Sequential Trail Hops</span>
              <span className="font-medium text-[#EDE8DE]">{currentCase.edges.length} On-Chain Transactions</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#242227]">
              <span className="text-[#A8A399]">Terminal Identified Exchange</span>
              <span className="font-medium text-[#B8935F]">{currentCase.exchange.name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#242227]">
              <span className="text-[#A8A399]">Exchange Deposit UID</span>
              <span className="font-medium text-[#EDE8DE]">{currentCase.exchange.depositUid}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[#2A272D] px-6 py-4 bg-[#161418] flex items-center justify-between">
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-[#A8A399] hover:text-[#EDE8DE]"
          >
            Cancel
          </button>

          <button
            onClick={handleDownloadJson}
            className="inline-flex items-center gap-2 rounded bg-[#B8935F] px-4 py-2 text-xs font-semibold text-[#131114] hover:bg-[#CFAC78] transition-colors shadow-sm"
          >
            {downloadedJson ? (
              <>
                <Check className="h-4 w-4" />
                Package Exported
              </>
            ) : (
              <>
                <FileJson className="h-4 w-4" />
                Download Forensic JSON Package
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
