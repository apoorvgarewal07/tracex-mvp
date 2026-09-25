import { useState } from 'react';
import { ForensicCase } from '../types';
import { Shield, Download, Copy, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client';

interface Section91NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: ForensicCase;
}

export function Section91NoticeModal({
  isOpen,
  onClose,
  currentCase,
}: Section91NoticeModalProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const { exchange } = currentCase;
  const terminalTx = currentCase.edges[currentCase.edges.length - 1];

  const noticeText = `GOVERNMENT OF INDIA
MINISTRY OF HOME AFFAIRS
INDIAN CYBER CRIME COORDINATION CENTRE (I4C)
OFFICE OF THE INVESTIGATING OFFICER (PROTOTYPE DEMONSTRATION)

SAMPLE DIRECTIVE UNDER SECTION 91 OF CR.P.C. / SECTION 94 OF BNSS, 2023
[NOTE: FOR RESEARCH AND INVESTIGATIVE PROTOTYPE DEMONSTRATION ONLY - NOT A REAL COURT SUBMISSION]

Case Crime Reference: ${currentCase.firNumber}
Docket Number: ${currentCase.ncrpDocketNumber}
Date of Generation: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}

TO:
The Nodal / Legal Compliance Officer,
${exchange.name}
FIU-IND Registration No.: ${exchange.fiuRegistrationNumber}
Jurisdictional Address: ${exchange.physicalJurisdiction}
Email: ${exchange.nodalEmail}

SUBJECT: SAMPLE NOTICE TEMPLATE REGARDING FORENSIC TRACE TERMINATION INTO VASP
1. An investigation has been registered vide ${currentCase.firNumber} regarding '${currentCase.crimeCategory}', with alleged stolen proceeds of ${currentCase.stolenAmountINR} (${currentCase.stolenAmountCrypto}).
2. On-chain forensic tracing conducted via TraceX Prototype indicates fund flow terminates into:
   - Destination Deposit UID: ${exchange.depositUid}
   - Network: ${currentCase.chain}
   - Terminal Transaction Hash: ${terminalTx?.txHash || 'Verified on-chain'}
   - Terminal Amount: ${terminalTx?.amountCrypto || currentCase.stolenAmountCrypto}

[DISCLAIMER: SAMPLE PROTOTYPE DIRECTIVE]`;

  const handleCopyNotice = () => {
    navigator.clipboard.writeText(noticeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    setErrorMsg(null);
    try {
      const traceId = currentCase.id.startsWith('trace-') || currentCase.id.startsWith('custom-')
        ? currentCase.id
        : currentCase.id;

      const blob = await api.downloadFreezeNotice({
        trace_id: traceId,
        exchange_name: exchange.name,
        confidence_level: 'HIGH',
        investigator_name: `${currentCase.investigatingOfficer} (${currentCase.rank})`,
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sample_Freeze_Directive_${exchange.name.replace(/\s+/g, '_')}_${traceId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to download backend PDF:', err);
      // Fallback: If backend does not have this trace ID saved in DB yet, download client-formatted text
      const blob = new Blob([noticeText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Sample_Freeze_Directive_${exchange.name.replace(/\s+/g, '_')}.txt`;
      link.click();
      URL.revokeObjectURL(url);
      setErrorMsg('Note: Backend PDF was unavailable for this mock ID; downloaded text template fallback.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] rounded bg-[#1C1A1E] border border-[#B8935F]/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#2A272D] px-6 py-4 bg-[#161418]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#B8935F]/40 bg-[#1C1A1E] text-[#B8935F]">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-normal text-[#EDE8DE]">
                Generate Sample Freeze Directive (Prototype)
              </h2>
              <p className="text-xs text-[#A8A399]">
                Section 91 CrPC / Section 94 BNSS Sample Demonstration Template
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8A399] hover:text-[#EDE8DE] p-1 rounded hover:bg-[#242227] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Disclaimer Callout Banner */}
        <div className="bg-[#B8935F]/10 border-b border-[#B8935F]/20 px-6 py-2.5 flex items-center gap-2 text-xs text-[#B8935F]">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>
            Prototype Demo: Generated PDFs bear a SAMPLE watermark and disclaimer banner for educational and forensic demonstration.
          </span>
        </div>

        {/* Notice Preview Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="bg-[#141215] p-4 rounded border border-[#2A272D] font-mono text-xs leading-relaxed text-[#EDE8DE] whitespace-pre-wrap select-text">
            {noticeText}
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800 text-amber-300 text-xs">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t border-[#2A272D] px-6 py-4 bg-[#161418] flex items-center justify-between gap-3">
          <button
            onClick={handleCopyNotice}
            className="inline-flex items-center gap-1.5 rounded border border-[#2E2B32] bg-[#1C1A1E] px-3.5 py-2 text-xs text-[#EDE8DE] hover:border-[#B8935F]/40 hover:bg-[#242227] transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#3B6B54]" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied to Clipboard' : 'Copy Text'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded px-3.5 py-2 text-xs text-[#A8A399] hover:text-[#EDE8DE] transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center gap-2 rounded bg-[#B8935F] px-4 py-2 text-xs font-medium text-[#131114] hover:bg-[#CFAC78] transition-colors shadow-sm disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#131114]" />
                  <span>Generating PDF from Backend...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download Sample Directive (PDF)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
