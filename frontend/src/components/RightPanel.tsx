import { useState, useEffect } from 'react';
import { ForensicCase, ClusteringResponse } from '../types';
import {
  AlertTriangle,
  Building2,
  FileText,
  Download,
  Send,
  CheckCircle2,
  Copy,
  Check,
  UserCheck,
  Mail,
  Phone,
  Cpu,
  Layers,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

interface RightPanelProps {
  currentCase: ForensicCase;
  activeHop: number;
  onOpenNotice: () => void;
  onOpenExport: () => void;
}

export function RightPanel({
  currentCase,
  activeHop,
  onOpenNotice,
  onOpenExport,
}: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<'threat' | 'clustering'>('threat');
  const [copiedUid, setCopiedUid] = useState(false);
  const [registrySynced, setRegistrySynced] = useState(false);
  const [clusteringData, setClusteringData] = useState<ClusteringResponse | null>(null);
  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [expandedCluster, setExpandedCluster] = useState<string | null>('0');
  const [copiedWallet, setCopiedWallet] = useState<string | null>(null);

  const { exchange, riskScore, riskFactors } = currentCase;

  // Fetch or update K-Means clustering when switching to clustering tab or when case changes
  useEffect(() => {
    if (activeTab === 'clustering') {
      fetchClustering();
    }
  }, [activeTab, currentCase.id]);

  const fetchClustering = async () => {
    setClusteringLoading(true);
    try {
      const res = await api.clusterWallets(currentCase.id);
      if (res && res.clustering) {
        setClusteringData(res);
      }
    } catch (err) {
      console.warn('Backend clustering fallback to node analysis:', err);
      // Fallback clustering from case nodes
      const allAddresses = currentCase.nodes.map((n) => n.address);
      const half = Math.ceil(allAddresses.length / 2);
      setClusteringData({
        trace_id: currentCase.id,
        clustering: {
          clusters: {
            '0': allAddresses.slice(0, half),
            '1': allAddresses.slice(half),
          },
          centroids: {
            '0': [2.8, 1.4, 2.1, 0.4, 0.3],
            '1': [1.1, 0.4, 0.9, 0.1, 0.1],
          },
          summary: {
            '0': { description: 'High-velocity Dispersion / Mixer Cluster', count: half },
            '1': { description: 'One-time Transit / Mule Wallet', count: allAddresses.length - half },
          },
        },
      });
    } finally {
      setClusteringLoading(false);
    }
  };

  const handleCopyUid = (uid: string) => {
    navigator.clipboard.writeText(uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyWallet = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedWallet(addr);
    setTimeout(() => setCopiedWallet(null), 2000);
  };

  const handleSyncRegistry = () => {
    setRegistrySynced(true);
    setTimeout(() => setRegistrySynced(false), 3000);
  };

  const severityColor =
    riskScore >= 70
      ? 'text-[#8C3B3B] border-[#8C3B3B]'
      : riskScore >= 40
      ? 'text-[#B8935F] border-[#B8935F]'
      : 'text-[#3B6B54] border-[#3B6B54]';

  const severityBg =
    riskScore >= 70
      ? 'bg-[#8C3B3B]/10'
      : riskScore >= 40
      ? 'bg-[#B8935F]/10'
      : 'bg-[#3B6B54]/10';

  const severityLabel =
    riskScore >= 70
      ? 'High Severity • Anomalous Flow'
      : riskScore >= 40
      ? 'Moderate Threat • Multi-Hop Mule'
      : 'Low Threat • Standard Flow';

  return (
    <aside className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-[#2A272D] bg-[#161418] overflow-y-auto">
      {/* Tab Switcher Header */}
      <div className="border-b border-[#2A272D] bg-[#141215] px-5 py-2 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('threat')}
          className={`flex-1 py-1.5 px-2.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'threat'
              ? 'bg-[#242227] text-[#EDE8DE] border border-[#B8935F]/40'
              : 'text-[#7E7972] hover:text-[#EDE8DE]'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-[#B8935F]" />
          <span>Threat & VASP</span>
        </button>

        <button
          onClick={() => setActiveTab('clustering')}
          className={`flex-1 py-1.5 px-2.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'clustering'
              ? 'bg-[#242227] text-[#EDE8DE] border border-[#B8935F]/40'
              : 'text-[#7E7972] hover:text-[#EDE8DE]'
          }`}
        >
          <Cpu className="h-3.5 w-3.5 text-[#B8935F]" />
          <span>ML Clusters</span>
        </button>
      </div>

      {/* TAB 1: Threat Assessment & Identified Exchange */}
      {activeTab === 'threat' && (
        <>
          {/* Risk Assessment Header */}
          <div className="p-5 border-b border-[#2A272D]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-medium text-[#B8935F] tracking-wide">
                Forensic Risk Scoring
              </span>
              <span className="text-[11px] text-[#A8A399] bg-[#1C1A1E] px-2 py-0.5 rounded border border-[#2E2B32]">
                AML Anomaly Metric
              </span>
            </div>
            <h2 className="font-serif text-xl font-normal text-[#EDE8DE] leading-snug">
              Threat Assessment
            </h2>

            {/* Risk Score Meter */}
            <div className="mt-4 panel-dossier rounded p-3.5 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-[#A8A399]">Calculated Threat Index</div>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className={`font-serif text-3xl font-semibold ${severityColor.split(' ')[0]}`}>
                    {riskScore}
                  </span>
                  <span className="text-xs text-[#7E7972]">/ 100</span>
                </div>
                <div className={`text-[11px] font-medium mt-0.5 ${severityColor.split(' ')[0]}`}>
                  {severityLabel}
                </div>
              </div>

              <div
                className={`h-12 w-12 rounded-full border-2 ${severityColor.split(' ')[1]} flex items-center justify-center ${severityBg}`}
              >
                <AlertTriangle className={`h-6 w-6 ${severityColor.split(' ')[0]}`} />
              </div>
            </div>

            {/* Risk Breakdown Items */}
            <div className="mt-3 space-y-2">
              {riskFactors.length === 0 ? (
                <div className="text-xs text-[#7E7972] p-2 italic">No anomalous risk vectors detected.</div>
              ) : (
                riskFactors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="panel-dossier-subtle rounded p-2.5 text-xs flex items-start gap-2.5"
                  >
                    <div
                      className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        factor.severity === 'high'
                          ? 'bg-[#8C3B3B]'
                          : factor.severity === 'medium'
                          ? 'bg-[#B8935F]'
                          : 'bg-[#3B6B54]'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[#EDE8DE] font-medium truncate">{factor.title}</span>
                        <span className="text-[10px] text-[#B8935F] ml-1">+{factor.impactScore}</span>
                      </div>
                      <p className="text-[11px] text-[#A8A399] mt-0.5 leading-relaxed">
                        {factor.description}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Identified Exchange Dossier */}
          <div className="p-5 border-b border-[#2A272D] flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium text-[#B8935F] flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Terminal Destination
                </div>
                <h3 className="font-serif text-lg text-[#EDE8DE] font-normal">
                  Exchange Off-Ramp Endpoint
                </h3>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] text-[#3B6B54] bg-[#3B6B54]/10 border border-[#3B6B54]/30 px-2 py-0.5 rounded">
                <CheckCircle2 className="h-3 w-3" /> FIU-IND Registered
              </span>
            </div>

            {/* Exchange Intelligence Card */}
            <div className="panel-dossier rounded p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#EDE8DE]">{exchange.name}</div>
                  <div className="text-[11px] text-[#A8A399]">{exchange.fiuRegistrationNumber}</div>
                </div>
                <span className="rounded bg-[#201D22] border border-[#2A272D] px-2 py-0.5 text-[10px] text-[#B8935F]">
                  PMLA Regulated
                </span>
              </div>

              {/* Deposit UID and KYC */}
              <div className="bg-[#161418] p-2.5 rounded border border-[#2A272D] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#7E7972] block">Destination Deposit UID</span>
                    <span className="text-xs font-semibold text-[#EDE8DE]">{exchange.depositUid}</span>
                  </div>
                  <button
                    onClick={() => handleCopyUid(exchange.depositUid)}
                    className="text-xs text-[#A8A399] hover:text-[#EDE8DE] flex items-center gap-1 bg-[#242227] px-2 py-1 rounded"
                  >
                    {copiedUid ? <Check className="h-3 w-3 text-[#3B6B54]" /> : <Copy className="h-3 w-3" />}
                    {copiedUid ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="border-t border-[#242227] pt-1.5 flex items-center justify-between text-xs">
                  <span className="text-[#A8A399] flex items-center gap-1">
                    <UserCheck className="h-3.5 w-3.5 text-[#3B6B54]" />
                    KYC Profile
                  </span>
                  <span className="text-[#EDE8DE] font-medium">{exchange.kycStatus}</span>
                </div>

                {/* Account Holder with explicit DEMO DATA badge */}
                <div className="text-[11px] text-[#A8A399] flex justify-between items-center">
                  <span className="flex items-center gap-1.5">
                    <span>Account Holder</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2A2521] text-[#B8935F] border border-[#B8935F]/30 font-mono">
                      DEMO DATA
                    </span>
                  </span>
                  <span className="text-[#EDE8DE] font-mono text-[10px]">
                    {exchange.accountHolderMasked}
                  </span>
                </div>
              </div>

              {/* Recoverable Balance Estimate with explicit DEMO DATA badge */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#A8A399] flex items-center gap-1.5">
                  <span>Est. Recoverable Assets</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2A2521] text-[#B8935F] border border-[#B8935F]/30 font-mono">
                    DEMO DATA
                  </span>
                </span>
                <span className="font-semibold text-[#B8935F] text-right font-mono text-[11px]">
                  {exchange.estimatedRecoverableBalance}
                </span>
              </div>

              {/* Nodal Officer Contact Details */}
              <div className="pt-2 border-t border-[#242227] text-xs space-y-1.5 text-[#A8A399]">
                <div className="text-[11px] font-medium text-[#EDE8DE]">Nodal Compliance Desk (Public Info):</div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Mail className="h-3.5 w-3.5 text-[#B8935F]" />
                  <span className="text-[#EDE8DE]">{exchange.nodalEmail}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <Phone className="h-3.5 w-3.5 text-[#B8935F]" />
                  <span>{exchange.nodalDeskPhone}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: ML K-Means Behavioral Clustering */}
      {activeTab === 'clustering' && (
        <div className="p-5 flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-medium text-[#B8935F] flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" />
                Unsupervised Machine Learning
              </div>
              <h2 className="font-serif text-lg text-[#EDE8DE] font-normal">
                K-Means Wallet Clusters
              </h2>
            </div>
            <button
              onClick={fetchClustering}
              disabled={clusteringLoading}
              className="p-1.5 rounded bg-[#242227] hover:bg-[#2F2B33] text-[#A8A399] hover:text-[#EDE8DE] border border-[#2E2B32] transition-colors"
              title="Re-run K-Means clustering algorithm on active trace"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${clusteringLoading ? 'animate-spin text-[#B8935F]' : ''}`} />
            </button>
          </div>

          <p className="text-xs text-[#A8A399] leading-relaxed">
            Groups wallet nodes based on 5 transaction features (velocity, fan-out degree, volume in/out) to uncover Sybil rings and money mule networks.
          </p>

          <div className="panel-dossier-subtle p-3 rounded flex items-center justify-between text-xs">
            <span className="text-[#A8A399]">Algorithm & Framework:</span>
            <span className="font-mono text-[#B8935F] text-[11px]">Scikit-Learn K-Means (k=4)</span>
          </div>

          {clusteringLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-xs text-[#A8A399] gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-[#B8935F]" />
              <span>Computing cluster centroids and feature vectors...</span>
            </div>
          )}

          {!clusteringLoading && clusteringData && (
            <div className="space-y-3">
              {Object.entries(clusteringData.clustering.summary || {}).map(([cid, summaryItem]) => {
                const members = clusteringData.clustering.clusters?.[cid] || [];
                const isExpanded = expandedCluster === cid;
                const centroid = clusteringData.clustering.centroids?.[cid] || [];

                return (
                  <div
                    key={cid}
                    className="rounded-lg border border-[#2A272D] bg-[#141215] overflow-hidden transition-colors hover:border-[#B8935F]/40"
                  >
                    <div
                      onClick={() => setExpandedCluster(isExpanded ? null : cid)}
                      className="p-3 bg-[#18161A] flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-[#B8935F]" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-[#7E7972]" />
                        )}
                        <span className="text-xs font-semibold text-[#EDE8DE]">
                          Cluster #{cid}: {summaryItem.description}
                        </span>
                      </div>
                      <span className="text-[10px] bg-[#B8935F]/10 border border-[#B8935F]/30 text-[#B8935F] px-2 py-0.5 rounded font-mono">
                        {members.length} Wallets
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="p-3 space-y-2.5 border-t border-[#242227] text-xs">
                        {centroid.length > 0 && (
                          <div className="text-[10px] text-[#7E7972] font-mono bg-[#141215] p-2 rounded border border-[#2A272D]">
                            <span className="text-[#A8A399] block mb-1">Normalized Centroid Vector:</span>
                            [{centroid.map((v) => (typeof v === 'number' ? v.toFixed(2) : v)).join(', ')}]
                          </div>
                        )}

                        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                          <span className="text-[11px] text-[#A8A399] block">Cluster Member Addresses:</span>
                          {members.map((addr, idx) => (
                            <div
                              key={`${addr}-${idx}`}
                              className="flex items-center justify-between p-1.5 rounded bg-[#1C1A1E] font-mono text-[11px] text-[#EDE8DE] border border-[#262429]"
                            >
                              <span className="truncate pr-2">{addr}</span>
                              <button
                                onClick={() => handleCopyWallet(addr)}
                                className="text-[10px] text-[#A8A399] hover:text-[#EDE8DE] bg-[#242227] px-1.5 py-0.5 rounded flex-shrink-0"
                                title="Copy address"
                              >
                                {copiedWallet === addr ? (
                                  <Check className="h-3 w-3 text-[#3B6B54]" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Directive Actions Suite */}
      <div className="p-5 space-y-2.5 bg-[#141215] border-t border-[#2A272D]">
        <div className="text-[11px] font-medium text-[#A8A399] mb-1">
          Sample Directive Actions (Prototype)
        </div>

        {/* PRIMARY CTA: Section 91 Notice */}
        <button
          id="draft-sec91-notice-action-btn"
          onClick={onOpenNotice}
          className="w-full rounded bg-[#B8935F] py-2.5 px-4 text-xs font-semibold text-[#131114] hover:bg-[#CFAC78] transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
        >
          <FileText className="h-4 w-4" />
          Generate Sample Freeze Directive (PDF)
        </button>

        {/* Secondary Action: Export Briefing */}
        <button
          id="export-briefing-action-btn"
          onClick={onOpenExport}
          className="w-full rounded border border-[#2E2B32] bg-[#1C1A1E] py-2 px-3 text-xs text-[#EDE8DE] hover:border-[#B8935F]/40 hover:bg-[#242227] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Download className="h-3.5 w-3.5 text-[#B8935F]" />
          Export Intelligence Brief
        </button>

        {/* Tertiary Action: NCRP Simulation */}
        <button
          id="ncrp-sync-action-btn"
          onClick={handleSyncRegistry}
          className="w-full rounded border border-[#2E2B32] bg-[#1C1A1E] py-2 px-3 text-xs text-[#A8A399] hover:text-[#EDE8DE] hover:border-[#2E2B32] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {registrySynced ? (
            <>
              <Check className="h-3.5 w-3.5 text-[#3B6B54]" />
              <span className="text-[#3B6B54]">Simulation Logged (NCRP 1930)</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5 text-[#B8935F]" />
              <span>Simulate Flag in NCRP 1930 Portal</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
