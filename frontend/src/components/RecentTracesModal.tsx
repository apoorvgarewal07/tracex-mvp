import { useState, useEffect } from 'react';
import { Database, Search, X, Loader2, ArrowRight, Clock, AlertTriangle } from 'lucide-react';
import { api } from '../api/client';
import { BackendTraceListItem } from '../types';

interface RecentTracesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrace: (traceId: string) => void;
}

export function RecentTracesModal({
  isOpen,
  onClose,
  onSelectTrace,
}: RecentTracesModalProps) {
  const [traces, setTraces] = useState<BackendTraceListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      api
        .listTraces(0, 100)
        .then((data) => {
          setTraces(data || []);
        })
        .catch((err) => {
          console.error('Failed to load recent traces:', err);
          setError('Could not reach backend API. Ensure FastAPI server is running on port 8000.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTraces = traces.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.complaint_id && t.complaint_id.toLowerCase().includes(q)) ||
      (t.source_wallet && t.source_wallet.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.target_vasp && t.target_vasp.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded bg-[#1C1A1E] border border-[#B8935F]/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A272D] px-6 py-4 bg-[#161418]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#B8935F]/40 bg-[#1C1A1E] text-[#B8935F]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-normal text-[#EDE8DE]">
                  Database Traces Archive
                </h2>
                <span className="text-[10px] bg-[#B8935F]/10 border border-[#B8935F]/30 text-[#B8935F] px-2 py-0.5 rounded font-mono">
                  {traces.length} Recorded
                </span>
              </div>
              <p className="text-xs text-[#A8A399]">
                Live SQLite audit trail of multi-hop blockchain forensic investigations
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

        {/* Filter bar */}
        <div className="border-b border-[#2A272D] px-6 py-3 bg-[#18161A] flex items-center justify-between gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Complaint ID, Wallet Address (0x...), Target VASP, or Trace UUID..."
              className="w-full rounded border border-[#2E2B32] bg-[#141215] px-3.5 py-2 pl-9 text-xs text-[#EDE8DE] placeholder-[#7E7972] focus:border-[#B8935F] focus:outline-none transition-colors"
            />
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7E7972]" />
          </div>
          <div className="text-xs text-[#7E7972] whitespace-nowrap">
            Showing {filteredTraces.length} of {traces.length} traces
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-[#A8A399] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#B8935F]" />
              <p className="text-xs">Querying database traces from GET /api/v1/traces...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredTraces.length === 0 && (
            <div className="text-center py-16 text-[#7E7972] text-xs">
              No matching traces found in database archive.
            </div>
          )}

          {!loading &&
            !error &&
            filteredTraces.map((item) => {
              const riskPct = Math.round(item.risk_score * 100);
              const isHighRisk = riskPct >= 70;
              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-[#2A272D] bg-[#141215] p-4 hover:border-[#B8935F]/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold text-[#EDE8DE]">
                        {item.complaint_id || 'NCRP-AUTO'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                          item.status === 'completed'
                            ? 'bg-[#3B6B54]/10 border-[#3B6B54]/30 text-[#3B6B54]'
                            : 'bg-amber-950/30 border-amber-800/40 text-amber-400'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#B8935F] bg-[#1C1A1E] px-2 py-0.5 rounded border border-[#2E2B32]">
                        {item.hops_count} Hops Traversed
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                          isHighRisk
                            ? 'bg-[#8C3B3B]/10 border-[#8C3B3B]/40 text-rose-400'
                            : 'bg-[#B8935F]/10 border-[#B8935F]/30 text-[#B8935F]'
                        }`}
                      >
                        Risk: {riskPct}%
                      </span>
                      {item.target_vasp && item.target_vasp !== '-' && (
                        <span className="text-[10px] text-[#EDE8DE] bg-[#221F24] px-2 py-0.5 rounded border border-[#3E3A42]">
                          Terminal: {item.target_vasp}
                        </span>
                      )}
                    </div>

                    <div className="font-mono text-xs text-[#A8A399] flex items-center gap-1.5 truncate">
                      <span className="text-[#7E7972]">Source:</span>
                      <span className="text-[#EDE8DE] truncate">{item.source_wallet}</span>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-[#7E7972]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleString('en-IN')}
                      </span>
                      <span className="font-mono text-[10px] text-[#555]">
                        UUID: {item.id.slice(0, 12)}...
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onSelectTrace(item.id);
                      onClose();
                    }}
                    className="inline-flex items-center gap-2 rounded bg-[#242227] hover:bg-[#B8935F] hover:text-[#131114] text-xs font-medium text-[#EDE8DE] px-3.5 py-2 border border-[#3A363E] transition-all flex-shrink-0 cursor-pointer"
                  >
                    <span>Load Trace Graph</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A272D] px-6 py-3 bg-[#161418] flex items-center justify-between text-xs text-[#7E7972]">
          <span>Trace records synchronized with NCRP Forensics Engine</span>
          <button
            onClick={onClose}
            className="rounded px-3 py-1.5 text-xs text-[#A8A399] hover:text-[#EDE8DE] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
