import { useState, useEffect } from 'react';
import { FORENSIC_CASES } from './data/cases';
import { ForensicCase } from './types';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { HeroGraph } from './components/HeroGraph';
import { RightPanel } from './components/RightPanel';
import { Section91NoticeModal } from './components/Section91NoticeModal';
import { EvidenceExportModal } from './components/EvidenceExportModal';
import { HomeScreen } from './components/HomeScreen';
import { RecentTracesModal } from './components/RecentTracesModal';
import { VaspDirectoryModal } from './components/VaspDirectoryModal';
import { api, BackendTraceDetail } from './api/client';
import { buildForensicCaseFromBackend } from './utils/graphAdapter';
import { useWebSocket } from './hooks/useWebSocket';

export default function App() {
  const [activeView, setActiveView] = useState<'landing' | 'dashboard'>('landing');
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [currentCase, setCurrentCase] = useState<ForensicCase>(FORENSIC_CASES[0]);
  const [activeHop, setActiveHop] = useState<number>(0);
  const [isTracing, setIsTracing] = useState<boolean>(false);
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [activeTraceId, setActiveTraceId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [pinnedAddresses, setPinnedAddresses] = useState<Set<string>>(new Set());
  const [lastBackendDetail, setLastBackendDetail] = useState<BackendTraceDetail | null>(null);
  const [isRecentTracesModalOpen, setIsRecentTracesModalOpen] = useState<boolean>(false);
  const [isVaspDirectoryModalOpen, setIsVaspDirectoryModalOpen] = useState<boolean>(false);

  // Real-time WebSocket connection to backend forensics engine
  const { status: traceStatus, progress: traceProgress, latestHop } = useWebSocket(activeTraceId, {
    onHopDiscovered: (_hop, _progress) => {
      // When a hop is discovered live, optionally fetch intermediate detail
      if (activeTraceId) {
        api
          .getTrace(activeTraceId)
          .then((detail) => {
            if (detail && detail.hops && detail.hops.length > 0) {
              setLastBackendDetail(detail);
              const partialCase = buildForensicCaseFromBackend(
                detail,
                currentCase.chain,
                currentCase.ncrpDocketNumber,
                pinnedAddresses
              );
              setCurrentCase(partialCase);
            }
          })
          .catch(() => {});
      }
    },
    onTraceCompleted: async () => {
      if (activeTraceId) {
        try {
          const detail = await api.getTrace(activeTraceId);
          setLastBackendDetail(detail);
          const adaptedCase = buildForensicCaseFromBackend(
            detail,
            currentCase.chain,
            currentCase.ncrpDocketNumber,
            pinnedAddresses
          );
          setCurrentCase(adaptedCase);
          const maxH =
            adaptedCase.edges.length > 0
              ? Math.max(...adaptedCase.edges.map((e) => e.hopIndex))
              : 1;
          setActiveHop(maxH);
        } catch (e) {
          console.error('[App] Error fetching completed trace detail:', e);
        }
      }
      setIsExecuting(false);
    },
    onTraceFailed: (error) => {
      console.warn('[App] Real-time trace failed:', error);
      setIsExecuting(false);
    },
  });

  const handlePinNode = (address: string) => {
    const addrLower = address.toLowerCase();
    const nextPinned = new Set<string>(pinnedAddresses);
    nextPinned.add(addrLower);
    setPinnedAddresses(nextPinned);

    if (lastBackendDetail) {
      const adapted = buildForensicCaseFromBackend(
        lastBackendDetail,
        currentCase.chain,
        currentCase.ncrpDocketNumber,
        nextPinned
      );
      setCurrentCase(adapted);
    } else {
      // Support promotion in mock/preset cases
      setCurrentCase((prevCase) => {
        let promotedWallet: any = null;
        let targetClusterHop = 2;

        const updatedNodes = prevCase.nodes.map((n) => {
          if (n.entityType === 'cluster' && n.clusteredNodes) {
            const found = n.clusteredNodes.find(
              (cn) => cn.address.toLowerCase() === addrLower
            );
            if (found) {
              targetClusterHop = n.hopIndex;
              promotedWallet = {
                ...found,
                id: found.id || `promoted-${addrLower.slice(0, 8)}`,
                isPinned: true,
                x: n.x,
                y: Math.max(80, n.y - 100),
              };
              const remaining = n.clusteredNodes.filter(
                (cn) => cn.address.toLowerCase() !== addrLower
              );
              return {
                ...n,
                label: `+ ${remaining.length} Dispersed Wallets`,
                clusteredNodes: remaining,
                y: n.y + 30,
              };
            }
          }
          return n;
        });

        if (promotedWallet) {
          const updatedEdges = [...prevCase.edges];
          const srcSiphon = updatedNodes.find((n) => n.hopIndex === targetClusterHop - 1);
          const tgtConsolidator = updatedNodes.find((n) => n.hopIndex === targetClusterHop + 1);

          if (srcSiphon && !updatedEdges.some((e) => e.target === promotedWallet.id)) {
            updatedEdges.push({
              id: `edge-pin-${srcSiphon.id}-${promotedWallet.id}`,
              source: srcSiphon.id,
              target: promotedWallet.id,
              txHash: `0xpin${Math.random().toString(36).slice(2, 12)}`,
              amountCrypto: promotedWallet.volumeOut || '3.50 ETH',
              token: prevCase.token || 'ETH',
              amountINR: promotedWallet.fiatEquivalentINR || '₹9,10,000',
              timestamp: 'On-chain',
              delayFromPrevious: `Hop ${targetClusterHop}`,
              hopIndex: targetClusterHop,
              gasFee: '0.0021 ETH',
              resolved: true,
            });
          }
          if (tgtConsolidator && !updatedEdges.some((e) => e.source === promotedWallet.id)) {
            updatedEdges.push({
              id: `edge-pin-${promotedWallet.id}-${tgtConsolidator.id}`,
              source: promotedWallet.id,
              target: tgtConsolidator.id,
              txHash: `0xpin${Math.random().toString(36).slice(2, 12)}`,
              amountCrypto: promotedWallet.volumeOut || '3.50 ETH',
              token: prevCase.token || 'ETH',
              amountINR: promotedWallet.fiatEquivalentINR || '₹9,10,000',
              timestamp: 'On-chain',
              delayFromPrevious: `Hop ${targetClusterHop + 1}`,
              hopIndex: targetClusterHop + 1,
              gasFee: '0.0021 ETH',
              resolved: true,
            });
          }

          return {
            ...prevCase,
            nodes: [...updatedNodes, promotedWallet],
            edges: updatedEdges,
          };
        }
        return prevCase;
      });
    }
  };

  // URL Hash routing synchronization
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('dashboard')) {
        setActiveView('dashboard');
      } else {
        setActiveView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);

    // Intentional choice: page reload always begins at 'landing' for a fresh session
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToDashboard = () => {
    setHasActiveSession(true);
    setActiveView('dashboard');
    window.location.hash = 'dashboard';
  };

  const navigateToLanding = () => {
    setActiveView('landing');
    window.location.hash = '';
  };

  const handleSelectCase = (selectedCase: ForensicCase) => {
    setActiveTraceId(null);
    setLastBackendDetail(null);
    setPinnedAddresses(new Set<string>());
    setCurrentCase(selectedCase);
    setActiveHop(0);
    setIsTracing(false);
    navigateToDashboard();
  };

  const handleResetTrace = () => {
    setActiveHop(0);
    setIsTracing(false);
  };

  // Fallback simulator for offline/demo operation when backend is not reached
  const handleCustomSearchFallback = (
    address: string,
    chain: string = 'Ethereum (ETH)',
    complaintId?: string
  ) => {
    navigateToDashboard();
    const docket = complaintId || `NCRP/2024/${Math.floor(10000 + Math.random() * 90000)}`;
    const shortAddr = address.slice(0, 8);
    const customCase: ForensicCase = {
      id: `custom-${Date.now()}`,
      ncrpDocketNumber: docket,
      firNumber: `FIR ${Math.floor(100 + Math.random() * 900)}/2024`,
      policeStation: 'Special Cyber Crime Cell, New Delhi',
      investigatingOfficer: 'Inspector Vikramaditya Sen',
      rank: 'Inspector of Police (Forensic Cyber)',
      badgeNumber: 'I4C-DEL-7712',
      reportingDate:
        new Date().toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' IST',
      crimeCategory: 'Cryptocurrency Fraud & P2P Siphoning',
      complainantName: 'Rameshwar K. & 2 Others',
      stolenAmountCrypto: '48.50 ETH',
      stolenAmountINR: '₹1,26,10,000',
      chain,
      token: 'ETH',
      targetWallet: address,
      riskScore: 91,
      riskSummary:
        'High-velocity dispersal detected from suspect address into intermediate consolidator terminating in FIU-IND registered exchange deposit wallet.',
      exchange: {
        name: 'Binance Holdings Ltd.',
        fiuRegistrationNumber: 'FIU-IND-VDA-2024-0012',
        depositUid: `99${Math.floor(100000 + Math.random() * 900000)}`,
        depositTag: 'MEMO_TARGET_INFLOW',
        kycStatus: 'Verified (PAN + Aadhaar)',
        accountHolderMasked: 'M**** P**** (Thane, Maharashtra)',
        accountAgeDays: 32,
        nodalEmail: 'law-enforcement@binance.com',
        nodalDeskPhone: '+91 11 4982 9100',
        physicalJurisdiction: 'Indian Nodal Compliance Office, Cyber City, Gurugram',
        estimatedRecoverableBalance: '42.20 ETH (₹1,09,72,000)',
        freezeStatus: 'Notice Pending',
        isSimulatedAccountData: true,
      },
      riskFactors: [
        {
          title: 'Direct Link to Active NCRP Report',
          description: 'Address matches open citizen fraud complaints on National Cyber Crime Portal.',
          severity: 'high',
          impactScore: 35,
        },
        {
          title: 'Algorithmic Peeling Chain',
          description: 'Outflow executed within 180 seconds across 2 intermediate transit tiers.',
          severity: 'high',
          impactScore: 32,
        },
        {
          title: 'Registered Exchange Terminal Node',
          description: 'Deposit identified with full Indian KYC documentation.',
          severity: 'low',
          impactScore: 14,
        },
      ],
      investigatorNotes: [
        `Automated forensic probe initiated for target wallet address ${address}.`,
        'Funds originated from victim phishing portal deposit, dispersed through mule accounts.',
        'Immediate statutory Section 91 preservation notice recommended to freeze account assets.',
      ],
      nodes: [
        {
          id: 'custom-victim',
          label: 'Victim Inflow Source',
          address: `0x${address.slice(2, 6)}aaa${address.slice(-34)}`,
          entityType: 'victim',
          risk: 'low',
          balance: '0.00 ETH',
          volumeOut: '48.50 ETH',
          volumeIn: '48.50 ETH',
          fiatEquivalentINR: '₹1,26,10,000',
          x: 80,
          y: 220,
          hopIndex: 0,
          txCount: 1,
          status: 'resolved',
          tags: ['Incident Origin'],
          firstSeen: 'Recent Inflow',
          lastSeen: 'Recent Inflow',
        },
        {
          id: 'custom-mule-1',
          label: 'Target Suspect Wallet',
          address,
          entityType: 'mule',
          risk: 'high',
          balance: '0.82 ETH',
          volumeOut: '47.68 ETH',
          volumeIn: '48.50 ETH',
          fiatEquivalentINR: '₹1,23,96,800',
          x: 340,
          y: 170,
          hopIndex: 1,
          txCount: 12,
          status: 'pending',
          tags: ['Target Address', 'Mule Tier-1'],
          firstSeen: 'Recent Inflow',
          lastSeen: 'Recent Inflow',
        },
        {
          id: 'custom-peel-2a',
          label: 'Peeling Split Sub-Account',
          address: `0x${address.slice(2, 6)}bbb${address.slice(-34)}`,
          entityType: 'peeling',
          risk: 'high',
          balance: '0.12 ETH',
          volumeOut: '45.10 ETH',
          volumeIn: '45.22 ETH',
          fiatEquivalentINR: '₹1,17,26,000',
          x: 600,
          y: 130,
          hopIndex: 2,
          txCount: 6,
          status: 'pending',
          tags: ['94% Traced Stream'],
          firstSeen: 'Recent',
          lastSeen: 'Recent',
        },
        {
          id: 'custom-peel-2b',
          label: 'Mule Fee Cut',
          address: `0x${address.slice(2, 6)}ccc${address.slice(-34)}`,
          entityType: 'peeling',
          risk: 'medium',
          balance: '2.46 ETH',
          volumeOut: '0.00 ETH',
          volumeIn: '2.46 ETH',
          fiatEquivalentINR: '₹6,39,600',
          x: 580,
          y: 330,
          hopIndex: 2,
          txCount: 2,
          status: 'pending',
          tags: ['Commission Cut'],
          firstSeen: 'Recent',
          lastSeen: 'Recent',
        },
        {
          id: 'custom-exchange',
          label: 'Binance Centralized Exchange',
          address: '0x28c6c06298d514db089934071355e5743bf21d60',
          entityType: 'exchange',
          risk: 'medium',
          balance: '45.10 ETH',
          volumeOut: '0.00 ETH',
          volumeIn: '45.10 ETH',
          fiatEquivalentINR: '₹1,17,26,000',
          x: 880,
          y: 220,
          hopIndex: 3,
          txCount: 1,
          status: 'pending',
          tags: ['Identified Exchange', 'PAN/Aadhaar KYC'],
          firstSeen: 'Recent',
          lastSeen: 'Recent',
        },
      ],
      edges: [
        {
          id: 'edge-custom-0-1',
          source: 'custom-victim',
          target: 'custom-mule-1',
          txHash: `0x4a8b${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
          amountCrypto: '48.50 ETH',
          token: 'ETH',
          amountINR: '₹1,26,10,000',
          timestamp: 'Recent Block',
          delayFromPrevious: 'Incident Inflow',
          hopIndex: 1,
          gasFee: '0.0021 ETH',
          resolved: false,
        },
        {
          id: 'edge-custom-1-2a',
          source: 'custom-mule-1',
          target: 'custom-peel-2a',
          txHash: `0x7c2d${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
          amountCrypto: '45.22 ETH',
          token: 'ETH',
          amountINR: '₹1,17,57,200',
          timestamp: 'Recent Block +4m',
          delayFromPrevious: '+4m 12s',
          hopIndex: 2,
          gasFee: '0.0024 ETH',
          resolved: false,
        },
        {
          id: 'edge-custom-1-2b',
          source: 'custom-mule-1',
          target: 'custom-peel-2b',
          txHash: `0x9e1f${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
          amountCrypto: '2.46 ETH',
          token: 'ETH',
          amountINR: '₹6,39,600',
          timestamp: 'Recent Block +4m',
          delayFromPrevious: '+4m 15s',
          hopIndex: 2,
          gasFee: '0.0018 ETH',
          resolved: false,
        },
        {
          id: 'edge-custom-2a-exchange',
          source: 'custom-peel-2a',
          target: 'custom-exchange',
          txHash: `0x1f3a${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`,
          amountCrypto: '45.10 ETH',
          token: 'ETH',
          amountINR: '₹1,17,26,000',
          timestamp: 'Recent Block +9m',
          delayFromPrevious: '+5m 02s',
          hopIndex: 3,
          gasFee: '0.0035 ETH',
          resolved: false,
        },
      ],
    };

    setCurrentCase(customCase);
    setActiveHop(0);
    setIsTracing(false);
    setIsExecuting(false);
  };

  // Load a trace directly from the backend database archive
  const handleLoadBackendTrace = async (traceId: string) => {
    setIsExecuting(true);
    navigateToDashboard();
    try {
      const detail = await api.getTrace(traceId);
      if (detail) {
        setLastBackendDetail(detail);
        const adaptedCase = buildForensicCaseFromBackend(
          detail,
          detail.hops?.[0]?.chain?.includes('POLYGON') ? 'Polygon (POL)' : 'Ethereum (ETH)',
          detail.complaint_id
        );
        setCurrentCase(adaptedCase);
        setActiveTraceId(traceId);
        const maxH = adaptedCase.edges.length > 0
          ? Math.max(...adaptedCase.edges.map((e) => e.hopIndex))
          : 1;
        setActiveHop(maxH);
      }
    } catch (err) {
      console.error('Failed to load trace detail:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTraceAddressFromDirectory = (address: string) => {
    handleExecuteTrace(address, 'Ethereum (ETH)');
  };

  // Primary execution handler: triggers live backend trace, then falls back seamlessly if offline
  const handleExecuteTrace = async (
    address: string,
    chain: string,
    complaintId?: string,
    maxHops: number = 15,
    stopAtVasp: boolean = true
  ) => {
    navigateToDashboard();
    setIsExecuting(true);
    setActiveHop(0);
    setIsTracing(false);

    try {
      const resp = await api.startTrace({
        victim_wallet: address,
        chain: chain.includes('Polygon') ? 'POLYGON' : 'ETH',
        complaint_id: complaintId,
        max_hops: maxHops,
        stop_at_vasp: stopAtVasp,
      });

      if (resp && resp.trace_id) {
        setActiveTraceId(resp.trace_id);

        // Polling fallback to ensure completion is captured even without active WebSockets
        let attempts = 0;
        const pollInterval = setInterval(async () => {
          attempts += 1;
          try {
            const detail = await api.getTrace(resp.trace_id);
            if (detail && detail.status === 'completed') {
              clearInterval(pollInterval);
              const adaptedCase = buildForensicCaseFromBackend(detail, chain, complaintId);
              setCurrentCase(adaptedCase);
              const maxH = adaptedCase.edges.length > 0
                ? Math.max(...adaptedCase.edges.map((e) => e.hopIndex))
                : 1;
              setActiveHop(maxH);
              setIsExecuting(false);
            } else if (detail && detail.hops && detail.hops.length > 0) {
              const partialCase = buildForensicCaseFromBackend(detail, chain, complaintId);
              setCurrentCase(partialCase);
            }
          } catch {
            // keep polling
          }

          if (attempts > 20) {
            clearInterval(pollInterval);
            setIsExecuting(false);
          }
        }, 1500);

        return;
      }
    } catch (err) {
      console.warn('[App] Backend API offline or unreachable, switching to simulation fallback:', err);
      handleCustomSearchFallback(address, chain, complaintId);
    }
  };

  if (activeView === 'landing') {
    return (
      <>
        <HomeScreen
          onExecuteTrace={handleExecuteTrace}
          onSelectCase={handleSelectCase}
          onOpenRecentTraces={() => setIsRecentTracesModalOpen(true)}
          onOpenVaspDirectory={() => setIsVaspDirectoryModalOpen(true)}
          hasActiveSession={hasActiveSession}
          activeCase={currentCase}
          onReturnToDashboard={navigateToDashboard}
        />
        {/* Global Modals available if opened */}
        <Section91NoticeModal
          isOpen={isNoticeModalOpen}
          onClose={() => setIsNoticeModalOpen(false)}
          currentCase={currentCase}
        />
        <EvidenceExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          currentCase={currentCase}
        />
        <RecentTracesModal
          isOpen={isRecentTracesModalOpen}
          onClose={() => setIsRecentTracesModalOpen(false)}
          onSelectTrace={handleLoadBackendTrace}
        />
        <VaspDirectoryModal
          isOpen={isVaspDirectoryModalOpen}
          onClose={() => setIsVaspDirectoryModalOpen(false)}
          onTraceAddress={handleTraceAddressFromDirectory}
        />
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#131114] text-[#EDE8DE] overflow-hidden select-none">
      {/* Top Dossier Briefing Banner */}
      <Header
        currentCase={currentCase}
        onOpenNotice={() => setIsNoticeModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenRecentTraces={() => setIsRecentTracesModalOpen(true)}
        onOpenVaspDirectory={() => setIsVaspDirectoryModalOpen(true)}
        onNavigateHome={navigateToLanding}
      />

      {/* Main 3-Column Investigative Layout */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* Left: Target Input + Case Metadata Panel */}
        <LeftPanel
          currentCase={currentCase}
          isExecuting={isExecuting}
          onSelectCase={handleSelectCase}
          onExecuteTrace={handleExecuteTrace}
          onResetTrace={handleResetTrace}
          onOpenRecentTraces={() => setIsRecentTracesModalOpen(true)}
          onOpenVaspDirectory={() => setIsVaspDirectoryModalOpen(true)}
        />

        {/* Center: Hero Fund-Flow Graph */}
        <HeroGraph
          currentCase={currentCase}
          onOpenNotice={() => setIsNoticeModalOpen(true)}
          activeHop={activeHop}
          setActiveHop={setActiveHop}
          isTracing={isTracing}
          setIsTracing={setIsTracing}
          traceStatus={traceStatus}
          traceProgress={traceProgress}
          latestHop={latestHop}
          isExecuting={isExecuting}
          onPinNode={handlePinNode}
          onSelectDefaultCase={() => handleSelectCase(FORENSIC_CASES[0])}
        />

        {/* Right: Risk Score, Identified Exchange, ML K-Means Clusters, and Section 91 Directives */}
        <RightPanel
          currentCase={currentCase}
          activeHop={activeHop}
          onOpenNotice={() => setIsNoticeModalOpen(true)}
          onOpenExport={() => setIsExportModalOpen(true)}
        />
      </main>

      {/* Legal Section 91 Freeze Notice Modal */}
      <Section91NoticeModal
        isOpen={isNoticeModalOpen}
        onClose={() => setIsNoticeModalOpen(false)}
        currentCase={currentCase}
      />

      {/* Forensic Evidence Brief Export Modal */}
      <EvidenceExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        currentCase={currentCase}
      />

      {/* Database Traces Archive Modal */}
      <RecentTracesModal
        isOpen={isRecentTracesModalOpen}
        onClose={() => setIsRecentTracesModalOpen(false)}
        onSelectTrace={handleLoadBackendTrace}
      />

      {/* Verified VASP & Entity Directory Modal */}
      <VaspDirectoryModal
        isOpen={isVaspDirectoryModalOpen}
        onClose={() => setIsVaspDirectoryModalOpen(false)}
        onTraceAddress={handleTraceAddressFromDirectory}
      />
    </div>
  );
}
