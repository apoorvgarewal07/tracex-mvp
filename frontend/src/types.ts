export type RiskLevel = 'high' | 'medium' | 'low';

export interface ForensicNode {
  id: string;
  label: string;
  address: string;
  entityType: 'victim' | 'mule' | 'peeling' | 'mixer_attempt' | 'consolidator' | 'exchange' | 'cluster';
  risk: RiskLevel;
  balance: string;
  volumeOut: string;
  volumeIn: string;
  fiatEquivalentINR: string;
  x: number;
  y: number;
  hopIndex: number;
  txCount: number;
  status: 'pending' | 'active' | 'resolved';
  tags: string[];
  firstSeen: string;
  lastSeen: string;
  countryOrCluster?: string;
  clusteredNodes?: ForensicNode[];
  isPinned?: boolean;
}

export interface ForensicEdge {
  id: string;
  source: string;
  target: string;
  txHash: string;
  amountCrypto: string;
  token: string;
  amountINR: string;
  timestamp: string;
  delayFromPrevious: string;
  hopIndex: number;
  gasFee: string;
  resolved: boolean;
  method?: string;
}

export interface IdentifiedExchange {
  name: string;
  fiuRegistrationNumber: string;
  depositUid: string;
  depositTag?: string;
  kycStatus: 'Verified (PAN + Aadhaar)' | 'Partial KYC' | 'Non-Resident Offshore' | 'Unverified Account' | string;
  accountHolderMasked: string;
  accountAgeDays: number;
  nodalEmail: string;
  nodalDeskPhone: string;
  physicalJurisdiction: string;
  estimatedRecoverableBalance: string;
  freezeStatus: 'Notice Pending' | 'Preservation Ordered' | 'Frozen' | 'Liquidated' | string;
  confidence?: number;
  isSimulatedAccountData?: boolean;
}

export interface RiskFactor {
  title: string;
  description: string;
  severity: RiskLevel;
  impactScore: number;
}

export interface ForensicCase {
  id: string;
  ncrpDocketNumber: string;
  firNumber: string;
  policeStation: string;
  investigatingOfficer: string;
  rank: string;
  badgeNumber: string;
  reportingDate: string;
  crimeCategory: string;
  complainantName: string;
  stolenAmountCrypto: string;
  stolenAmountINR: string;
  chain: 'Ethereum (ETH)' | 'Polygon (POL)' | 'TRON (TRC-20)' | 'Ethereum (ERC-20)' | 'Bitcoin' | 'Solana' | string;
  token: string;
  targetWallet: string;
  riskScore: number;
  riskSummary: string;
  exchange: IdentifiedExchange;
  nodes: ForensicNode[];
  edges: ForensicEdge[];
  riskFactors: RiskFactor[];
  investigatorNotes: string[];
}

export interface BackendHealth {
  status: string;
  service: string;
  version: string;
  environment?: string;
  timestamp: string;
}

export interface BackendTraceListItem {
  id: string;
  source_wallet: string;
  complaint_id?: string;
  status: 'completed' | 'processing' | 'failed' | string;
  hops_count: number;
  risk_score: number;
  target_vasp?: string;
  created_at: string;
}

export interface WalletLabel {
  address: string;
  name: string;
  type: 'EXCHANGE' | 'MIXER' | 'ATTACKER' | 'DEX' | string;
  confidence: number;
  source?: string;
}

export interface ClusteringResultData {
  clusters: Record<string, string[]>;
  centroids: Record<string, number[]>;
  summary: Record<string, { description: string; count: number }>;
}

export interface ClusteringResponse {
  trace_id: string;
  clustering: ClusteringResultData;
}
