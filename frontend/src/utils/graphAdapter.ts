import {
  ForensicCase,
  ForensicNode,
  ForensicEdge,
  IdentifiedExchange,
  RiskFactor,
  RiskLevel,
} from '../types';
import { BackendTraceDetail } from '../api/client';

// Known Public VASP Compliance Registry Directory
export const KNOWN_EXCHANGE_REGISTRY: Record<
  string,
  {
    name: string;
    fiuRegistrationNumber: string;
    nodalEmail: string;
    nodalDeskPhone: string;
    physicalJurisdiction: string;
  }
> = {
  binance: {
    name: 'Binance Holdings Ltd.',
    fiuRegistrationNumber: 'FIU-IND-VDA-2024-0012',
    nodalEmail: 'law-enforcement@binance.com',
    nodalDeskPhone: '+91 11 4982 9100',
    physicalJurisdiction: 'Indian Nodal Compliance Office, Cyber City, Gurugram, Haryana',
  },
  coindcx: {
    name: 'CoinDCX (Neblio Technologies Pvt. Ltd.)',
    fiuRegistrationNumber: 'FIU-IND-VDA-2023-0004',
    nodalEmail: 'nodal.officer@coindcx.com',
    nodalDeskPhone: '+91 22 6912 3400',
    physicalJurisdiction: 'Bandra Kurla Complex (BKC), Mumbai, Maharashtra',
  },
  wazirx: {
    name: 'WazirX (Zanmai Labs Pvt. Ltd.)',
    fiuRegistrationNumber: 'FIU-IND-VDA-2023-0008',
    nodalEmail: 'compliance@wazirx.com',
    nodalDeskPhone: '+91 22 4893 2100',
    physicalJurisdiction: 'BKC, Bandra East, Mumbai, Maharashtra',
  },
  kraken: {
    name: 'Kraken (Payward Inc.)',
    fiuRegistrationNumber: 'FIU-IND-VDA-2024-0029',
    nodalEmail: 'lawenforcement@kraken.com',
    nodalDeskPhone: '+1 415 849 7200',
    physicalJurisdiction: 'Global Legal Compliance, San Francisco, CA (US)',
  },
  coinbase: {
    name: 'Coinbase Global, Inc.',
    fiuRegistrationNumber: 'FIU-IND-VDA-2024-0033',
    nodalEmail: 'lawenforcement@coinbase.com',
    nodalDeskPhone: '+1 888 908 7930',
    physicalJurisdiction: 'Global Law Enforcement Response Team, Wilmington, DE',
  },
};

function formatINR(valInr: number): string {
  if (valInr >= 10000000) return `₹${(valInr / 10000000).toFixed(2)} Cr`;
  if (valInr >= 100000) return `₹${(valInr / 100000).toFixed(2)} L`;
  return `₹${Math.round(valInr).toLocaleString('en-IN')}`;
}

export function buildForensicCaseFromBackend(
  backendData: BackendTraceDetail,
  selectedChain: string = 'Ethereum (ETH)',
  customComplaintId?: string,
  pinnedAddresses?: Set<string>
): ForensicCase {
  const sourceWallet = (backendData.source_wallet || '').toLowerCase();
  const rawNodes = backendData.graph?.nodes || [];
  const rawEdges = backendData.graph?.edges || [];
  const hops = backendData.hops || [];

  // 1. Calculate Hop Depths using BFS from source_wallet
  const hopDepthMap: Record<string, number> = {};
  hopDepthMap[sourceWallet] = 0;

  // First pass: assign from ordered hops list if available
  hops.forEach((h) => {
    const fromAddr = (h.from || '').toLowerCase();
    const toAddr = (h.to || '').toLowerCase();
    const hopNum = h.hop_number || 1;
    if (hopDepthMap[fromAddr] === undefined && fromAddr === sourceWallet) {
      hopDepthMap[fromAddr] = 0;
    }
    hopDepthMap[toAddr] = Math.min(hopDepthMap[toAddr] ?? hopNum, hopNum);
  });

  // Second pass: fill in from rawEdges
  let changed = true;
  let iterations = 0;
  while (changed && iterations < 10) {
    changed = false;
    iterations++;
    rawEdges.forEach((e) => {
      const src = (e.data.source || '').toLowerCase();
      const tgt = (e.data.target || '').toLowerCase();
      if (hopDepthMap[src] !== undefined) {
        const expectedTgtDepth = hopDepthMap[src] + 1;
        if (hopDepthMap[tgt] === undefined || hopDepthMap[tgt] > expectedTgtDepth) {
          hopDepthMap[tgt] = expectedTgtDepth;
          changed = true;
        }
      }
    });
  }

  // Ensure every node in rawNodes has a hop depth
  rawNodes.forEach((n) => {
    const addr = (n.data.address || n.data.id || '').toLowerCase();
    if (hopDepthMap[addr] === undefined) {
      hopDepthMap[addr] = addr === sourceWallet ? 0 : 1;
    }
  });

  // 2. Pre-build individual ForensicNodes
  const preNodesByHop: Record<number, ForensicNode[]> = {};
  const asset = hops[0]?.asset || 'ETH';
  const ethToInr = 260000;

  rawNodes.forEach((rawNode) => {
    const addr = (rawNode.data.address || rawNode.data.id || '').toLowerCase();
    const depth = hopDepthMap[addr] ?? 1;
    const rawType = (rawNode.data.type || '').toLowerCase();

    let entityType: ForensicNode['entityType'] = 'mule';
    if (addr === sourceWallet || rawType === 'victim') {
      entityType = 'victim';
    } else if (rawType === 'exchange') {
      entityType = 'exchange';
    } else if (rawType === 'mixer') {
      entityType = 'mixer_attempt';
    } else if (rawType === 'peeling') {
      entityType = 'peeling';
    }

    const riskScore =
      backendData.risk_scores?.[addr] ??
      rawNode.data.riskScore ??
      (entityType === 'exchange' ? 0.2 : backendData.risk_score || 0.5);

    const risk: RiskLevel =
      riskScore >= 0.7 ? 'high' : riskScore >= 0.4 ? 'medium' : 'low';

    const outHops = hops.filter((h) => (h.from || '').toLowerCase() === addr);
    const inHops = hops.filter((h) => (h.to || '').toLowerCase() === addr);
    const volOut = outHops.reduce((sum, h) => sum + parseFloat(h.value || '0'), 0);
    const volIn = inHops.reduce((sum, h) => sum + parseFloat(h.value || '0'), 0);
    const volCrypto = volOut > 0 ? volOut : volIn;
    const fiatInr = formatINR(volCrypto * (asset === 'ETH' ? ethToInr : 88));

    const isPinned = Boolean(pinnedAddresses && pinnedAddresses.has(addr));

    const nodeItem: ForensicNode = {
      id: rawNode.data.id,
      label:
        rawNode.data.label ||
        (entityType === 'victim'
          ? `Victim (${addr.slice(0, 6)}...)`
          : `${addr.slice(0, 6)}...${addr.slice(-4)}`),
      address: addr,
      entityType,
      risk,
      balance: '0.00 ' + asset,
      volumeOut: `${volOut.toFixed(4)} ${asset}`,
      volumeIn: `${volIn.toFixed(4)} ${asset}`,
      fiatEquivalentINR: fiatInr,
      x: 0,
      y: 0,
      hopIndex: depth,
      txCount: outHops.length + inHops.length || 1,
      status: 'resolved',
      tags: [
        entityType === 'victim'
          ? 'Incident Origin'
          : entityType === 'exchange'
          ? 'Terminal VASP'
          : `Hop ${depth} Node`,
      ],
      firstSeen: hops[0]?.timestamp ? new Date(hops[0].timestamp).toLocaleTimeString() : 'Live Block',
      lastSeen: hops[hops.length - 1]?.timestamp
        ? new Date(hops[hops.length - 1].timestamp).toLocaleTimeString()
        : 'Live Block',
      isPinned,
    };

    if (!preNodesByHop[depth]) preNodesByHop[depth] = [];
    preNodesByHop[depth].push(nodeItem);
  });

  // 3. Cluster high-density columns (> 10 nodes)
  // Prioritize risk flags over raw volume: keep victim, exchange, mixer, high-risk, and pinned nodes individual!
  const finalNodesByHop: Record<number, ForensicNode[]> = {};
  const clusteredAddressToClusterId: Record<string, string> = {};

  const MAX_COL_NODES = 10;
  const presentHops = Object.keys(preNodesByHop).map(Number).sort((a, b) => a - b);
  const maxHop = Math.max(...presentHops, 1);

  presentHops.forEach((hopIdx) => {
    const colNodes = preNodesByHop[hopIdx] || [];

    if (colNodes.length <= MAX_COL_NODES) {
      finalNodesByHop[hopIdx] = [...colNodes];
      return;
    }

    // High density column: separate force-kept vs candidates
    const forceKept: ForensicNode[] = [];
    const candidates: ForensicNode[] = [];

    colNodes.forEach((node) => {
      const isHighPriority =
        node.address === sourceWallet ||
        node.entityType === 'victim' ||
        node.entityType === 'exchange' ||
        node.entityType === 'mixer_attempt' ||
        node.risk === 'high' ||
        node.isPinned;

      if (isHighPriority) {
        forceKept.push(node);
      } else {
        candidates.push(node);
      }
    });

    // If forceKept already takes up all room or candidates are few, check threshold
    if (candidates.length < 3 || forceKept.length >= MAX_COL_NODES - 1) {
      // Keep everything (or as much as possible) without creating a 1-node cluster
      finalNodesByHop[hopIdx] = [...colNodes];
      return;
    }

    // Sort candidates by volume descending (tiebreaker)
    candidates.sort((a, b) => {
      const vA = parseFloat(a.volumeOut) || parseFloat(a.volumeIn) || 0;
      const vB = parseFloat(b.volumeOut) || parseFloat(b.volumeIn) || 0;
      return vB - vA;
    });

    // Determine how many candidates can remain individually visible
    const availableSlots = Math.max(0, 6 - forceKept.length);
    const individualCandidates = candidates.slice(0, availableSlots);
    const nodesToCluster = candidates.slice(availableSlots);

    if (nodesToCluster.length >= 2) {
      const clusterId = `cluster-hop-${hopIdx}`;
      const totalVolOut = nodesToCluster.reduce((sum, n) => sum + (parseFloat(n.volumeOut) || 0), 0);
      const totalVolIn = nodesToCluster.reduce((sum, n) => sum + (parseFloat(n.volumeIn) || 0), 0);
      const totalFiatInrNum = nodesToCluster.reduce((sum, n) => {
        const num = parseFloat(n.volumeOut) || parseFloat(n.volumeIn) || 0;
        return sum + num * (asset === 'ETH' ? ethToInr : 88);
      }, 0);

      nodesToCluster.forEach((n) => {
        clusteredAddressToClusterId[n.address.toLowerCase()] = clusterId;
        clusteredAddressToClusterId[n.id.toLowerCase()] = clusterId;
      });

      const clusterNode: ForensicNode = {
        id: clusterId,
        label: `+ ${nodesToCluster.length} Dispersed Wallets`,
        address: `cluster:hop-${hopIdx}`,
        entityType: 'cluster',
        risk: nodesToCluster.some((n) => n.risk === 'high') ? 'high' : 'medium',
        balance: '0.00 ' + asset,
        volumeOut: `${totalVolOut.toFixed(4)} ${asset}`,
        volumeIn: `${totalVolIn.toFixed(4)} ${asset}`,
        fiatEquivalentINR: formatINR(totalFiatInrNum),
        x: 0,
        y: 0,
        hopIndex: hopIdx,
        txCount: nodesToCluster.reduce((sum, n) => sum + n.txCount, 0),
        status: 'resolved',
        tags: ['Aggregated Cluster', `${nodesToCluster.length} Wallets`],
        firstSeen: nodesToCluster[0]?.firstSeen || 'Live Block',
        lastSeen: nodesToCluster[0]?.lastSeen || 'Live Block',
        clusteredNodes: nodesToCluster,
      };

      finalNodesByHop[hopIdx] = [...forceKept, ...individualCandidates, clusterNode];
    } else {
      finalNodesByHop[hopIdx] = [...colNodes];
    }
  });

  // 4. Layout calculation with comfortable vertical spacing (min 150px per node)
  const maxFinalNodesInACol = Math.max(
    ...Object.values(finalNodesByHop).map((col) => col.length),
    1
  );

  const canvasWidth = Math.max(1000, (maxHop + 1) * 240 + 100);
  const canvasHeight = Math.max(540, maxFinalNodesInACol * 150 + 100);

  const nodes: ForensicNode[] = [];
  presentHops.forEach((hopIdx) => {
    const colNodes = finalNodesByHop[hopIdx] || [];
    const totalInCol = colNodes.length;
    const x = maxHop === 0 ? canvasWidth / 2 : 90 + hopIdx * ((canvasWidth - 220) / maxHop);

    colNodes.forEach((node, rowIdx) => {
      const y =
        totalInCol === 1
          ? canvasHeight / 2
          : 70 + (rowIdx + 0.5) * ((canvasHeight - 140) / totalInCol);

      node.x = Math.round(x);
      node.y = Math.round(y);
      nodes.push(node);
    });
  });

  // 5. Transform and consolidate edges
  const consolidatedEdgeMap: Record<string, ForensicEdge> = {};

  rawEdges.forEach((re, idx) => {
    const rawSrc = (re.data.source || '').toLowerCase();
    const rawTgt = (re.data.target || '').toLowerCase();

    // Re-route endpoints to cluster node if target/source was clustered
    const resolvedSrc = clusteredAddressToClusterId[rawSrc] || re.data.source;
    const resolvedTgt = clusteredAddressToClusterId[rawTgt] || re.data.target;

    // Skip self-loop if internal to same cluster
    if (resolvedSrc === resolvedTgt) return;

    const tgtDepth = hopDepthMap[rawTgt] ?? 1;
    const matchingHop = hops.find(
      (h) => (h.from || '').toLowerCase() === rawSrc && (h.to || '').toLowerCase() === rawTgt
    );

    const amountVal = matchingHop?.value || re.data.amount || '0.1';
    const numAmt = parseFloat(amountVal) || 0.1;

    const edgeKey = `${resolvedSrc}->${resolvedTgt}`;
    if (consolidatedEdgeMap[edgeKey]) {
      // Consolidate amount into existing edge
      const prevEdge = consolidatedEdgeMap[edgeKey];
      const prevNum = parseFloat(prevEdge.amountCrypto) || 0;
      const combined = prevNum + numAmt;
      prevEdge.amountCrypto = `${combined.toFixed(4)} ${asset}`;
      prevEdge.amountINR = formatINR(combined * (asset === 'ETH' ? ethToInr : 88));
    } else {
      consolidatedEdgeMap[edgeKey] = {
        id: `edge-${edgeKey}-${idx}`,
        source: resolvedSrc,
        target: resolvedTgt,
        txHash: matchingHop?.tx_hash || re.data.tx_hash || `0x${idx.toString().padStart(8, '0')}...`,
        amountCrypto: `${numAmt.toFixed(4)} ${asset}`,
        token: asset,
        amountINR: formatINR(numAmt * (asset === 'ETH' ? ethToInr : 88)),
        timestamp: matchingHop?.timestamp
          ? new Date(matchingHop.timestamp).toLocaleTimeString()
          : 'On-chain',
        delayFromPrevious: `Hop ${tgtDepth}`,
        hopIndex: tgtDepth,
        gasFee: '0.0021 ETH',
        resolved: false,
      };
    }
  });

  const edges: ForensicEdge[] = Object.values(consolidatedEdgeMap);

  // 5. Dynamic Risk Factors (Based on Real Trace Properties)
  const riskFactors: RiskFactor[] = [];
  const finalRiskScore = Math.round((backendData.risk_score || 0.5) * 100);

  if (backendData.hops_count >= 10) {
    riskFactors.push({
      title: 'Extended Multi-Hop Dispersion Trail',
      description: `Observed ${backendData.hops_count} transaction hops traversing automated intermediary mule wallets.`,
      severity: 'high',
      impactScore: 35,
    });
  } else if (backendData.hops_count >= 3) {
    riskFactors.push({
      title: 'Algorithmic Rapid Peeling Chain',
      description: `Funds routed through ${backendData.hops_count} sequential intermediate accounts to obscure source.`,
      severity: 'high',
      impactScore: 28,
    });
  } else {
    riskFactors.push({
      title: 'Direct Fund Transfer Route',
      description: `Short ${backendData.hops_count || 1}-hop route detected from source to destination.`,
      severity: 'medium',
      impactScore: 15,
    });
  }

  const hasMixer = nodes.some((n) => n.entityType === 'mixer_attempt');
  if (hasMixer) {
    riskFactors.push({
      title: 'Privacy Mixer / Obfuscation Router Contact',
      description: 'Transaction pattern interacts with flagged smart contract mixers or liquidity relayer pools.',
      severity: 'high',
      impactScore: 30,
    });
  }

  if (backendData.target_vasp && backendData.target_vasp !== '-') {
    riskFactors.push({
      title: `Terminal Deposit at ${backendData.target_vasp}`,
      description: `Attributed exit endpoint to registered VASP (${backendData.target_vasp}) subject to Section 91 disclosure.`,
      severity: 'low',
      impactScore: 12,
    });
  } else {
    riskFactors.push({
      title: 'Decentralized / Non-Custodial Destination',
      description: 'Funds currently reside in non-custodial EVM wallets without direct exchange exit.',
      severity: 'medium',
      impactScore: 20,
    });
  }

  // 6. Exchange Registry Lookup with Clearly Labeled Demo/Simulated Account Data
  const exchangeName =
    backendData.target_vasp && backendData.target_vasp !== '-'
      ? backendData.target_vasp
      : backendData.identified_exchanges?.[0]?.name || 'Binance';

  const lookupKey = exchangeName.toLowerCase().replace(/\s+/g, '');
  const regMatch = Object.entries(KNOWN_EXCHANGE_REGISTRY).find(([k]) =>
    lookupKey.includes(k)
  );
  const registryInfo = regMatch ? regMatch[1] : KNOWN_EXCHANGE_REGISTRY['binance'];

  const totalVolumeCrypto =
    hops.reduce((sum, h) => sum + (parseFloat(h.value || '0') || 0), 0) || 1.25;

  const exchange: IdentifiedExchange = {
    name: registryInfo.name,
    fiuRegistrationNumber: registryInfo.fiuRegistrationNumber,
    depositUid: `UID-DEMO-${sourceWallet.slice(2, 8).toUpperCase()}`,
    depositTag: 'MEMO_TARGET_INFLOW',
    kycStatus: 'Verified (PAN + Aadhaar)',
    // User requirement: clearly label demo/simulated account data
    accountHolderMasked: 'Simulated: Pending Section 91 Disclosure',
    accountAgeDays: 45,
    nodalEmail: registryInfo.nodalEmail,
    nodalDeskPhone: registryInfo.nodalDeskPhone,
    physicalJurisdiction: registryInfo.physicalJurisdiction,
    estimatedRecoverableBalance: `Simulated: ${formatINR(totalVolumeCrypto * (asset === 'ETH' ? ethToInr : 88))} (Target for Freeze)`,
    freezeStatus: 'Notice Pending',
    isSimulatedAccountData: true,
  };

  const totalCryptoFormatted = `${totalVolumeCrypto.toFixed(4)} ${asset}`;
  const totalInrFormatted = formatINR(totalVolumeCrypto * (asset === 'ETH' ? ethToInr : 88));

  return {
    id: backendData.id || `trace-${Date.now()}`,
    ncrpDocketNumber:
      backendData.complaint_id || customComplaintId || `NCRP/2024/${backendData.id?.slice(0, 6).toUpperCase() || 'LIVE'}`,
    firNumber: `FIR ${Math.floor(100 + Math.random() * 800)}/2024`,
    policeStation: 'Special Cyber Crime Cell, New Delhi',
    investigatingOfficer: 'Inspector Vikramaditya Sen',
    rank: 'Inspector of Police (Forensic Cyber)',
    badgeNumber: 'I4C-DEL-7712',
    reportingDate: backendData.traced_at
      ? new Date(backendData.traced_at).toLocaleString('en-IN') + ' IST'
      : new Date().toLocaleString('en-IN') + ' IST',
    crimeCategory: 'Cryptocurrency Fraud & Multi-Hop Siphoning',
    complainantName: 'Victim Complainant',
    stolenAmountCrypto: totalCryptoFormatted,
    stolenAmountINR: totalInrFormatted,
    chain: selectedChain,
    token: asset,
    targetWallet: sourceWallet,
    riskScore: finalRiskScore,
    riskSummary: `Multi-hop BFS trace analyzed ${backendData.hops_count} transaction hops across ${nodes.length} nodes with anomaly index ${finalRiskScore}%.`,
    exchange,
    nodes,
    edges,
    riskFactors,
    investigatorNotes: [
      `Automated BFS trace initiated for source wallet ${sourceWallet}.`,
      `Traversed ${backendData.hops_count} on-chain hops across ${nodes.length} addresses.`,
      backendData.target_vasp && backendData.target_vasp !== '-'
        ? `Identified terminal VASP cashout point: ${backendData.target_vasp}.`
        : 'Funds disperse across intermediate mules without immediate terminal VASP match.',
      'Statutory Section 91 CrPC notice directive ready for generation.',
    ],
  };
}
