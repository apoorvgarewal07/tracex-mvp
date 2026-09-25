import { useState, useEffect } from 'react';
import { Building2, Search, X, Loader2, ArrowRight, Copy, Check, ShieldAlert, Sparkles, Filter } from 'lucide-react';
import { api } from '../api/client';
import { WalletLabel } from '../types';

interface VaspDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTraceAddress: (address: string) => void;
}

export function VaspDirectoryModal({
  isOpen,
  onClose,
  onTraceAddress,
}: VaspDirectoryModalProps) {
  const [labels, setLabels] = useState<WalletLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      api
        .getLabels()
        .then((data) => {
          setLabels(data || []);
        })
        .catch((err) => {
          console.error('Failed to load wallet labels:', err);
          setError('Could not reach backend labels API. Ensure FastAPI server is running.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const filteredLabels = labels.filter((l) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      l.name.toLowerCase().includes(q) ||
      l.address.toLowerCase().includes(q) ||
      l.type.toLowerCase().includes(q) ||
      (l.source && l.source.toLowerCase().includes(q));
    const matchType = selectedType === 'ALL' || l.type.toUpperCase() === selectedType;
    return matchQuery && matchType;
  });

  const entityTypes = ['ALL', 'EXCHANGE', 'MIXER', 'ATTACKER', 'DEX'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] rounded bg-[#1C1A1E] border border-[#B8935F]/40 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2A272D] px-6 py-4 bg-[#161418]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded border border-[#B8935F]/40 bg-[#1C1A1E] text-[#B8935F]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-normal text-[#EDE8DE]">
                  Verified VASP & Entity Directory
                </h2>
                <span className="text-[10px] bg-[#B8935F]/10 border border-[#B8935F]/30 text-[#B8935F] px-2 py-0.5 rounded font-mono">
                  {labels.length} Entities Indexed
                </span>
              </div>
              <p className="text-xs text-[#A8A399]">
                FIU-IND Registered Exchanges, High-Risk Mixers, and Exploiter Intelligence Database
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

        {/* Filter controls */}
        <div className="border-b border-[#2A272D] px-6 py-3 bg-[#18161A] flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by entity name (e.g. Binance, WazirX, Tornado) or EVM address..."
              className="w-full rounded border border-[#2E2B32] bg-[#141215] px-3.5 py-2 pl-9 text-xs text-[#EDE8DE] placeholder-[#7E7972] focus:border-[#B8935F] focus:outline-none transition-colors"
            />
            <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-[#7E7972]" />
          </div>

          {/* Type filters */}
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            {entityTypes.map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                  selectedType === type
                    ? 'bg-[#B8935F] text-[#131114] border-[#B8935F]'
                    : 'bg-[#141215] text-[#A8A399] border-[#2A272D] hover:text-[#EDE8DE]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading && (
            <div className="flex flex-col items-center justify-center py-16 text-[#A8A399] gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#B8935F]" />
              <p className="text-xs">Loading verified entity labels from GET /api/v1/labels...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {!loading && !error && filteredLabels.length === 0 && (
            <div className="text-center py-16 text-[#7E7972] text-xs">
              No matching entities found in directory.
            </div>
          )}

          {!loading &&
            !error &&
            filteredLabels.map((item, idx) => {
              const isExchange = item.type.toUpperCase() === 'EXCHANGE';
              const isMixer = item.type.toUpperCase() === 'MIXER';
              const isAttacker = item.type.toUpperCase() === 'ATTACKER';
              return (
                <div
                  key={`${item.address}-${idx}`}
                  className="rounded-lg border border-[#2A272D] bg-[#141215] p-3.5 hover:border-[#B8935F]/40 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[#EDE8DE]">{item.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                          isExchange
                            ? 'bg-[#3B6B54]/10 border-[#3B6B54]/40 text-[#3B6B54]'
                            : isMixer
                            ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                            : isAttacker
                            ? 'bg-[#8C3B3B]/20 border-rose-800 text-rose-400'
                            : 'bg-[#1C1A1E] border-[#2E2B32] text-[#A8A399]'
                        }`}
                      >
                        {item.type.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#A8A399] bg-[#1C1A1E] px-2 py-0.5 rounded border border-[#2E2B32]">
                        Confidence: {Math.round(item.confidence * 100)}%
                      </span>
                      {item.source && (
                        <span className="text-[10px] text-[#7E7972]">Source: {item.source}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 font-mono text-xs text-[#A8A399]">
                      <span className="truncate">{item.address}</span>
                      <button
                        onClick={() => handleCopy(item.address)}
                        className="text-[10px] text-[#A8A399] hover:text-[#EDE8DE] px-1.5 py-0.5 rounded bg-[#242227] flex-shrink-0"
                        title="Copy address"
                      >
                        {copiedAddress === item.address ? (
                          <Check className="h-3 w-3 text-[#3B6B54]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onTraceAddress(item.address);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 rounded bg-[#242227] hover:bg-[#B8935F] hover:text-[#131114] text-xs font-medium text-[#EDE8DE] px-3 py-1.5 border border-[#3A363E] transition-all flex-shrink-0 cursor-pointer"
                  >
                    <span>Trace Entity</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
        </div>

        {/* Footer */}
        <div className="border-t border-[#2A272D] px-6 py-3 bg-[#161418] flex items-center justify-between text-xs text-[#7E7972]">
          <span>Verified wallet labels integrated with Graph Forensics Engine</span>
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
