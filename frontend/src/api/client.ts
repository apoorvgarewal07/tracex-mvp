import axios from 'axios';
import { BackendHealth, BackendTraceListItem, WalletLabel, ClusteringResponse } from '../types';

const env = (import.meta as any).env || {};
export const API_BASE_URL = env.VITE_API_URL || 'http://localhost:8000';
export const WS_BASE_URL = env.VITE_WS_URL || API_BASE_URL.replace(/^http/, 'ws');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface StartTracePayload {
  victim_wallet: string;
  complaint_id?: string;
  tx_hashes?: string[];
  chain?: 'ETH' | 'POLYGON' | string;
  max_hops?: number;
  max_nodes?: number;
  stop_at_vasp?: boolean;
}

export interface TraceResponse {
  trace_id: string;
  status: string;
  message: string;
}

export interface BackendGraphNode {
  data: {
    id: string;
    label: string;
    type?: string;
    riskScore?: number;
    address?: string;
  };
}

export interface BackendGraphEdge {
  data: {
    id?: string;
    source: string;
    target: string;
    label?: string;
    amount?: string;
    tx_hash?: string;
    asset?: string;
  };
}

export interface BackendTraceDetail {
  id: string;
  trace_id: string;
  complaint_id?: string;
  source_wallet: string;
  hops_count: number;
  risk_score: number;
  target_vasp?: string;
  status: 'processing' | 'completed' | 'failed';
  hops: Array<{
    hop_number: number;
    from: string;
    to: string;
    value: string;
    asset: string;
    tx_hash: string;
    chain?: string;
    timestamp?: string;
  }>;
  identified_exchanges: Array<{
    name: string;
    address: string;
    confidence: number;
    source?: string;
  }>;
  risk_scores: Record<string, number>;
  graph: {
    nodes: BackendGraphNode[];
    edges: BackendGraphEdge[];
  };
  traced_at?: string;
}

export interface FreezeNoticePayload {
  trace_id: string;
  exchange_name: string;
  confidence_level?: string;
  investigator_name?: string;
}

export const api = {
  async checkHealth(): Promise<BackendHealth> {
    const res = await apiClient.get<BackendHealth>('/api/health');
    return res.data;
  },

  async startTrace(payload: StartTracePayload): Promise<TraceResponse> {
    const res = await apiClient.post<TraceResponse>('/api/v1/trace', payload);
    return res.data;
  },

  async getTrace(traceId: string): Promise<BackendTraceDetail> {
    const res = await apiClient.get<BackendTraceDetail>(`/api/v1/trace/${traceId}`);
    return res.data;
  },

  async listTraces(skip: number = 0, limit: number = 50): Promise<BackendTraceListItem[]> {
    const res = await apiClient.get<BackendTraceListItem[]>('/api/v1/traces', {
      params: { skip, limit },
    });
    return res.data;
  },

  async getLabels(): Promise<WalletLabel[]> {
    const res = await apiClient.get<WalletLabel[]>('/api/v1/labels');
    return res.data;
  },

  async getGraph(traceId: string): Promise<any> {
    const res = await apiClient.get(`/api/v1/graph/${traceId}`);
    return res.data;
  },

  async downloadFreezeNotice(payload: FreezeNoticePayload): Promise<Blob> {
    const res = await apiClient.post('/api/v1/freeze-notice', payload, {
      responseType: 'blob',
    });
    return res.data;
  },

  async clusterWallets(traceId: string): Promise<ClusteringResponse> {
    const res = await apiClient.post<ClusteringResponse>(`/api/v1/cluster/${traceId}`);
    return res.data;
  },

  getTraceWsUrl(traceId: string): string {
    return `${WS_BASE_URL}/ws/trace/${traceId}`;
  },
};

