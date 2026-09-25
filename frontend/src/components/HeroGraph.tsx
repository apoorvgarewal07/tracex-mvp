import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ForensicCase, ForensicNode, ForensicEdge } from '../types';
import {
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Table,
  Network,
  Info,
  ExternalLink,
  Copy,
  Check,
  Building2,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Split,
  Layers,
  Pin,
  Crosshair,
} from 'lucide-react';

interface HeroGraphProps {
  currentCase: ForensicCase;
  onOpenNotice: () => void;
  activeHop: number;
  setActiveHop: (hop: number) => void;
  isTracing: boolean;
  setIsTracing: (tracing: boolean) => void;
  traceStatus?: 'idle' | 'connecting' | 'connected' | 'completed' | 'failed' | 'disconnected';
  traceProgress?: number;
  latestHop?: any;
  isExecuting?: boolean;
  onPinNode?: (address: string) => void;
  onSelectDefaultCase?: () => void;
}

export function HeroGraph({
  currentCase,
  onOpenNotice,
  activeHop,
  setActiveHop,
  isTracing,
  setIsTracing,
  traceStatus,
  traceProgress,
  latestHop,
  isExecuting,
  onPinNode,
  onSelectDefaultCase,
}: HeroGraphProps) {
  const [viewMode, setViewMode] = useState<'graph' | 'ledger'>('graph');
  const [selectedNode, setSelectedNode] = useState<ForensicNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ForensicEdge | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Viewport zoom & pan (Expanded range: 30% to 500%)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const graphContainerRef = useRef<HTMLDivElement | null>(null);

  // Trace pulse physical position state
  const [pulsePositions, setPulsePositions] = useState<Record<string, { x: number; y: number; progress: number }>>({});
  const edgeRefs = useRef<Record<string, SVGPathElement | null>>({});
  const animFrameRef = useRef<number | null>(null);

  // Check empty state
  const isEmptyState = !currentCase || !currentCase.nodes || currentCase.nodes.length === 0;

  // Maximum hop index in current case
  const maxHop = currentCase?.edges?.length > 0
    ? Math.max(...currentCase.edges.map((e) => e.hopIndex), 1)
    : 1;

  // Dynamic Canvas Boundaries to prevent clipping on deep hops
  const maxX = currentCase?.nodes?.length > 0 ? Math.max(...currentCase.nodes.map((n) => n.x)) : 800;
  const maxY = currentCase?.nodes?.length > 0 ? Math.max(...currentCase.nodes.map((n) => n.y)) : 400;
  const svgWidth = Math.max(1000, maxX + 140);
  const svgHeight = Math.max(520, maxY + 110);

  // Reset selected node/edge on case change
  useEffect(() => {
    if (currentCase?.nodes?.length > 0) {
      setSelectedNode(currentCase.nodes[0]);
    } else {
      setSelectedNode(null);
    }
    setSelectedEdge(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [currentCase?.id]);

  // Fullscreen Esc key listener & body scroll locking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Mouse Wheel / Pinch Zoom Support (0.3x - 5.0x) with non-passive page scroll lock
  useEffect(() => {
    const el = graphContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      setZoom((prevZoom) => {
        const nextZoom = Math.min(5.0, Math.max(0.3, prevZoom * zoomFactor));
        return parseFloat(nextZoom.toFixed(2));
      });
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [viewMode, isEmptyState]);

  // Copy helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Traveling Pulse Engine
  const animateHop = useCallback(
    (hopToRun: number) => {
      if (!currentCase?.edges) {
        setIsTracing(false);
        return;
      }
      const edgesInHop = currentCase.edges.filter((e) => e.hopIndex === hopToRun);
      if (edgesInHop.length === 0) {
        setIsTracing(false);
        return;
      }

      const startTime = performance.now();
      const duration = 1200; // ms for pulse to traverse this hop

      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth cubic ease-in-out
        const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const newPositions: Record<string, { x: number; y: number; progress: number }> = {};

        edgesInHop.forEach((edge) => {
          const pathEl = edgeRefs.current[edge.id];
          if (pathEl) {
            const totalLen = pathEl.getTotalLength();
            const pt = pathEl.getPointAtLength(eased * totalLen);
            newPositions[edge.id] = { x: pt.x, y: pt.y, progress: eased };
          }
        });

        setPulsePositions(newPositions);

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(step);
        } else {
          // Completed this hop
          setPulsePositions({});
          setActiveHop(hopToRun);

          if (hopToRun < maxHop) {
            setTimeout(() => {
              animateHop(hopToRun + 1);
            }, 350);
          } else {
            setIsTracing(false);
            const exNode = currentCase.nodes.find((n) => n.entityType === 'exchange');
            if (exNode) setSelectedNode(exNode);
          }
        }
      };

      animFrameRef.current = requestAnimationFrame(step);
    },
    [currentCase?.edges, currentCase?.nodes, maxHop, setActiveHop, setIsTracing]
  );

  const startTrace = () => {
    if (isTracing || isEmptyState) return;
    setIsTracing(true);
    setActiveHop(0);
    setPulsePositions({});
    setSelectedEdge(null);
    animateHop(1);
  };

  const handleStepForward = () => {
    if (isTracing || isEmptyState) return;
    const nextHop = activeHop >= maxHop ? 1 : activeHop + 1;
    setIsTracing(true);
    animateHop(nextHop);
  };

  const handleResetTrace = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsTracing(false);
    setActiveHop(0);
    setPulsePositions({});
    setSelectedNode(currentCase?.nodes?.[0] || null);
    setSelectedEdge(null);
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Compute curved Bezier path between two nodes
  const calculatePath = (source: ForensicNode, target: ForensicNode) => {
    const dx = target.x - source.x;
    const cx1 = source.x + dx * 0.45;
    const cy1 = source.y;
    const cx2 = source.x + dx * 0.55;
    const cy2 = target.y;
    return `M ${source.x} ${source.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${target.x} ${target.y}`;
  };

  // Mouse pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
  };

  const handleMouseUp = () => setIsPanning(false);

  // Status strip state machine
  const showStatusStrip =
    isExecuting ||
    (traceStatus && traceStatus !== 'idle') ||
    (traceProgress !== undefined && traceProgress > 0 && traceProgress < 100);

  const graphContent = (
    <section
      className={`flex flex-col bg-[#131114] overflow-hidden ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen'
          : 'flex-1 relative overflow-hidden min-w-0 h-full'
      }`}
      style={
        isFullscreen
          ? {
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 99999,
              backgroundColor: '#131114',
            }
          : undefined
      }
    >
      {/* Top Hero Briefing Bar */}
      <div className="border-b border-[#2A272D] bg-[#161418] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-[#B8935F] tracking-wide flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8935F]"></span>
              Suspect Wallet In-Scope
            </span>
            <span className="text-xs text-[#7E7972]">•</span>
            <span className="text-xs text-[#A8A399]">{currentCase?.chain || 'EVM Chain'}</span>
            {isFullscreen && (
              <>
                <span className="text-xs text-[#7E7972]">•</span>
                <span className="text-xs text-[#B8935F] font-semibold">FULLSCREEN VIEWPORT</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h2 className="font-serif text-xl sm:text-2xl text-[#EDE8DE] font-normal tracking-tight">
              {currentCase?.targetWallet || 'No Target Configured'}
            </h2>
            {currentCase?.targetWallet && (
              <button
                onClick={() => handleCopy(currentCase.targetWallet)}
                className="text-[#A8A399] hover:text-[#EDE8DE] p-1 rounded hover:bg-[#242227] transition-colors"
                title="Copy Target Wallet Address"
              >
                {copiedText === currentCase.targetWallet ? (
                  <Check className="h-4 w-4 text-[#3B6B54]" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1 text-xs text-[#A8A399]">
            <span>
              Total Traced Outflow:{' '}
              <strong className="text-[#EDE8DE] font-medium">
                {currentCase?.stolenAmountCrypto || '0.00 ETH'}
              </strong>{' '}
              ({currentCase?.stolenAmountINR || '₹0'})
            </span>
            <span>•</span>
            <span>
              Trail Depth: <strong className="text-[#EDE8DE] font-medium">{maxHop} Hops</strong> to KYC Off-Ramp
            </span>
          </div>
        </div>

        {/* View Switcher & Fullscreen Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded border border-[#2E2B32] bg-[#1C1A1E] p-0.5 text-xs">
            <button
              id="view-mode-graph"
              onClick={() => setViewMode('graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'graph' ? 'bg-[#2A272D] text-[#EDE8DE] font-medium' : 'text-[#A8A399] hover:text-[#EDE8DE]'
              }`}
            >
              <Network className="h-3.5 w-3.5 text-[#B8935F]" />
              Fund-Flow Graph
            </button>
            <button
              id="view-mode-ledger"
              onClick={() => setViewMode('ledger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                viewMode === 'ledger' ? 'bg-[#2A272D] text-[#EDE8DE] font-medium' : 'text-[#A8A399] hover:text-[#EDE8DE]'
              }`}
            >
              <Table className="h-3.5 w-3.5 text-[#B8935F]" />
              Hop Ledger
            </button>
          </div>

          {isFullscreen && (
            <button
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#242227] hover:bg-[#2F2B33] text-xs text-[#EDE8DE] border border-[#3A363E] transition-colors"
              title="Exit Fullscreen Mode (Esc)"
            >
              <Minimize2 className="h-3.5 w-3.5 text-[#B8935F]" />
              <span>Exit Fullscreen</span>
              <kbd className="text-[10px] bg-[#161418] px-1 py-0.5 rounded text-[#7E7972] border border-[#2A272D]">Esc</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Hero Control Ribbon (Playback & Zoom Controls) */}
      <div className="border-b border-[#2A272D] bg-[#18161A] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            id="run-trace-pulse-btn"
            onClick={startTrace}
            disabled={isTracing || isEmptyState}
            className={`inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-medium transition-all shadow-sm ${
              isTracing
                ? 'bg-[#2A272D] text-[#A8A399] cursor-wait'
                : isEmptyState
                ? 'bg-[#2A272D] text-[#7E7972] cursor-not-allowed'
                : 'bg-[#B8935F] text-[#131114] hover:bg-[#CFAC78]'
            }`}
          >
            <Play className={`h-3.5 w-3.5 ${isTracing ? 'animate-pulse text-[#B8935F]' : 'fill-current'}`} />
            {isTracing ? 'Tracing Pulse In Progress...' : activeHop === 0 ? 'Execute Forensic Trace' : 'Re-trace Trail'}
          </button>

          <button
            id="step-forward-btn"
            onClick={handleStepForward}
            disabled={isTracing || isEmptyState}
            className="inline-flex items-center gap-1 rounded border border-[#2E2B32] bg-[#1C1A1E] px-2.5 py-1.5 text-xs text-[#EDE8DE] hover:border-[#B8935F]/40 disabled:opacity-50"
            title="Step forward by 1 hop"
          >
            <span>Step Hop</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            id="reset-trace-btn"
            onClick={handleResetTrace}
            disabled={isEmptyState}
            className="inline-flex items-center gap-1 rounded border border-[#2E2B32] bg-[#1C1A1E] px-2.5 py-1.5 text-xs text-[#A8A399] hover:text-[#EDE8DE] hover:border-[#2E2B32] disabled:opacity-50"
            title="Reset trace to origin"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* Hop Progression Scrubber */}
        {!isEmptyState && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#A8A399] mr-1">Hop Sequence:</span>
            {Array.from({ length: maxHop + 1 }).map((_, idx) => {
              const isOrigin = idx === 0;
              const isCurrent = activeHop === idx;
              const isPassed = activeHop >= idx;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    if (!isTracing) {
                      setActiveHop(idx);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                    isCurrent
                      ? 'bg-[#B8935F] text-[#131114] font-medium'
                      : isPassed
                      ? 'bg-[#1C1A1E] text-[#EDE8DE] border border-[#B8935F]/40'
                      : 'bg-[#141215] text-[#7E7972] border border-[#242227]'
                  }`}
                >
                  {isOrigin ? 'Origin' : `Hop ${idx}`}
                  {idx === maxHop && <Building2 className="h-3 w-3 ml-0.5" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Viewport Tools (Zoom Range 30% - 500% & Fullscreen) */}
        {viewMode === 'graph' && !isEmptyState && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom((z) => Math.max(0.3, parseFloat((z - 0.2).toFixed(2))))}
              className="p-1.5 rounded text-[#A8A399] hover:text-[#EDE8DE] hover:bg-[#242227]"
              title="Zoom out (Min 30%)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-[#7E7972] w-12 text-center font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(5.0, parseFloat((z + 0.2).toFixed(2))))}
              className="p-1.5 rounded text-[#A8A399] hover:text-[#EDE8DE] hover:bg-[#242227]"
              title="Zoom in (Max 500%)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1.5 rounded text-[#A8A399] hover:text-[#EDE8DE] hover:bg-[#242227]"
              title="Reset viewport view"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded text-[#A8A399] hover:text-[#EDE8DE] hover:bg-[#242227]"
              title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Viewport'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5 text-[#B8935F]" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Task 5: Status Strip & Real WebSocket Progress Indicator */}
      {showStatusStrip && (
        <div className="border-b border-[#2A272D] bg-[#171419] px-6 py-2 flex items-center justify-between gap-4 text-xs transition-all">
          <div className="flex items-center gap-2.5">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                traceStatus === 'failed'
                  ? 'bg-[#8C3B3B]'
                  : traceStatus === 'completed'
                  ? 'bg-[#3B6B54]'
                  : 'bg-[#B8935F] animate-pulse'
              }`}
            />
            <span className="text-[#EDE8DE] font-medium text-xs">
              {traceStatus === 'connecting' && 'Connecting to on-chain telemetry WebSocket...'}
              {traceStatus === 'connected' && !latestHop && 'WebSocket connected. Initiating multi-hop BFS traversal...'}
              {isExecuting && latestHop && (
                <>
                  Hop {latestHop.hop_number} Discovered:{' '}
                  <span className="font-mono text-[#B8935F]">
                    {latestHop.from?.slice(0, 6)}... → {latestHop.to?.slice(0, 6)}...
                  </span>{' '}
                  ({latestHop.value} {latestHop.asset || 'ETH'})
                </>
              )}
              {traceStatus === 'completed' && 'Trace Completed: All on-chain transaction hops and VASPs resolved.'}
              {traceStatus === 'failed' && 'Trace Incomplete: Connection or RPC timeout. Displaying partial graph.'}
              {!isExecuting && !traceStatus && 'Forensic engine active.'}
            </span>
          </div>

          <div className="flex items-center gap-3 w-56">
            <div className="flex-1 h-1.5 rounded-full bg-[#242227] overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  traceStatus === 'failed'
                    ? 'bg-[#8C3B3B]'
                    : traceStatus === 'completed'
                    ? 'bg-[#3B6B54]'
                    : 'bg-[#B8935F]'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(5, traceProgress || (isExecuting ? 30 : 0)))}%`,
                }}
              />
            </div>
            <span className="text-[11px] text-[#A8A399] font-mono w-10 text-right">
              {traceProgress || (isExecuting ? 30 : 0)}%
            </span>
          </div>
        </div>
      )}

      {/* Main Interactive Stage */}
      <div className="flex-1 relative flex overflow-hidden">
        {isEmptyState ? (
          /* Task 4: Empty / Idle State Forensic Reticle Placeholder */
          <div className="flex-1 h-full w-full flex flex-col items-center justify-center p-8 relative overflow-hidden evidence-grid select-none">
            <div className="relative flex items-center justify-center mb-6">
              <svg
                className="w-56 h-56 text-[#2A272D] animate-spin"
                style={{ animationDuration: '90s' }}
                viewBox="0 0 200 200"
              >
                <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
                <circle cx="100" cy="100" r="65" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
                <line x1="10" y1="100" x2="190" y2="100" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
                <line x1="100" y1="10" x2="100" y2="190" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-[#1C1A1E] border border-[#B8935F]/30 flex items-center justify-center shadow-lg">
                  <Crosshair className="h-7 w-7 text-[#B8935F]" />
                </div>
              </div>
            </div>

            <div className="text-center max-w-md space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1A1E] border border-[#2E2B32] text-[11px] font-medium text-[#B8935F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#B8935F] animate-pulse"></span>
                INVESTIGATION RETICLE STANDBY
              </div>
              <h3 className="font-serif text-2xl text-[#EDE8DE] font-normal">
                Awaiting Suspect Wallet Target
              </h3>
              <p className="text-xs text-[#A8A399] leading-relaxed">
                No active transaction trail currently loaded into the forensic viewport. Execute an investigative trace from the left panel or select an active NCRP benchmark case to initiate graph traversal.
              </p>
            </div>

            {onSelectDefaultCase && (
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={onSelectDefaultCase}
                  className="inline-flex items-center gap-2 rounded bg-[#B8935F] px-4 py-2 text-xs font-medium text-[#131114] hover:bg-[#CFAC78] transition-colors shadow-sm"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Load Benchmark Case (Euler Exploit)
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'graph' ? (
          <div
            ref={graphContainerRef}
            className="flex-1 h-full w-full relative evidence-grid cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* SVG Interactive Canvas */}
            <svg
              className="w-full h-full"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              preserveAspectRatio="xMidYMid meet"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '50% 50%',
                transition: isPanning ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <defs>
                {/* Arrow markers for edges */}
                <marker
                  id="arrow-unresolved"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#3A363E" />
                </marker>
                <marker
                  id="arrow-resolved"
                  viewBox="0 0 10 10"
                  refX="18"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 9 5 L 0 9 z" fill="#B8935F" />
                </marker>

                {/* Soft brass glow filter for the signature trace pulse */}
                <filter id="softBrassGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* EDGES / FUND-FLOW PATHS */}
              <g id="graph-edges">
                {currentCase.edges.map((edge) => {
                  const sourceNode = currentCase.nodes.find((n) => n.id === edge.source);
                  const targetNode = currentCase.nodes.find((n) => n.id === edge.target);
                  if (!sourceNode || !targetNode) return null;

                  const pathD = calculatePath(sourceNode, targetNode);
                  const isResolved = activeHop >= edge.hopIndex;
                  const isSelected = selectedEdge?.id === edge.id;

                  return (
                    <g
                      key={edge.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEdge(edge);
                        setSelectedNode(null);
                      }}
                    >
                      {/* Invisible wider hit area for easy clicking */}
                      <path d={pathD} fill="none" stroke="transparent" strokeWidth={24} />

                      {/* Base Background Edge */}
                      <path
                        ref={(el) => {
                          edgeRefs.current[edge.id] = el;
                        }}
                        id={`edge-path-${edge.id}`}
                        d={pathD}
                        fill="none"
                        stroke={
                          isSelected
                            ? '#EDE8DE'
                            : isResolved
                            ? 'rgba(184, 147, 95, 0.65)'
                            : 'rgba(58, 54, 62, 0.6)'
                        }
                        strokeWidth={isSelected ? 3 : isResolved ? 2.5 : 1.5}
                        strokeDasharray={isResolved ? 'none' : '4 4'}
                        markerEnd={isResolved ? 'url(#arrow-resolved)' : 'url(#arrow-unresolved)'}
                        className="transition-colors duration-300"
                      />

                      {/* Edge Label (Amount & Delay) */}
                      <g
                        transform={`translate(${
                          (sourceNode.x + targetNode.x) / 2
                        }, ${(sourceNode.y + targetNode.y) / 2 - 10})`}
                      >
                        <rect
                          x={-46}
                          y={-11}
                          width={92}
                          height={20}
                          rx={3}
                          fill="#18161A"
                          stroke={isSelected ? '#EDE8DE' : isResolved ? 'rgba(184, 147, 95, 0.3)' : '#2A272D'}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={3}
                          textAnchor="middle"
                          fill={isResolved ? '#EDE8DE' : '#A8A399'}
                          fontSize={9}
                          fontWeight={500}
                          style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                        >
                          {edge.amountCrypto}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </g>

              {/* SIGNATURE INTERACTIVE MOMENT: TRAVELING TRACE PULSE */}
              {Object.entries(pulsePositions).map(([edgeId, pos]: [string, { x: number; y: number; progress: number }]) => (
                <g key={`pulse-${edgeId}`} filter="url(#softBrassGlow)" className="pointer-events-none">
                  <circle cx={pos.x} cy={pos.y} r={9} fill="#B8935F" opacity={0.25} />
                  <circle cx={pos.x} cy={pos.y} r={5} fill="#B8935F" opacity={0.65} />
                  <circle cx={pos.x} cy={pos.y} r={2.5} fill="#EDE8DE" />
                </g>
              ))}

              {/* NODES */}
              <g id="graph-nodes">
                {currentCase.nodes.map((node) => {
                  const isOrigin = node.hopIndex === 0;
                  const isResolved = activeHop >= node.hopIndex;
                  const isSelected = selectedNode?.id === node.id;
                  const isExchange = node.entityType === 'exchange';
                  const isCluster = node.entityType === 'cluster';

                  // Risk color palette
                  const strokeColor =
                    isSelected
                      ? '#EDE8DE'
                      : isResolved
                      ? node.risk === 'high'
                        ? '#8C3B3B'
                        : node.risk === 'low'
                        ? '#3B6B54'
                        : '#B8935F'
                      : '#2E2B32';

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNode(node);
                        setSelectedEdge(null);
                      }}
                    >
                      {/* Selection / Exchange Ring */}
                      {(isSelected || (isExchange && isResolved)) && (
                        <circle
                          cx={0}
                          cy={0}
                          r={34}
                          fill="none"
                          stroke={isExchange ? '#3B6B54' : '#B8935F'}
                          strokeWidth={1.5}
                          strokeDasharray={isExchange ? '2 2' : 'none'}
                          opacity={0.7}
                        />
                      )}

                      {/* Cluster Node: Multi-layer Stacked Visual */}
                      {isCluster ? (
                        <g>
                          {/* Back Stack 2 */}
                          <rect
                            x={-28}
                            y={-28}
                            width={56}
                            height={56}
                            rx={8}
                            fill="#151317"
                            stroke={isResolved ? 'rgba(184, 147, 95, 0.25)' : '#242227'}
                            strokeWidth={1}
                            strokeDasharray="2 2"
                          />
                          {/* Back Stack 1 */}
                          <rect
                            x={-26}
                            y={-26}
                            width={52}
                            height={52}
                            rx={7}
                            fill="#1A181E"
                            stroke={isResolved ? 'rgba(184, 147, 95, 0.45)' : '#2E2B32'}
                            strokeWidth={1.2}
                          />
                          {/* Top Main Rect */}
                          <rect
                            x={-24}
                            y={-24}
                            width={48}
                            height={48}
                            rx={6}
                            fill="#201C24"
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 2.5 : 1.75}
                            className="transition-all duration-300"
                            style={{
                              filter: isSelected ? 'drop-shadow(0 2px 10px rgba(184, 147, 95, 0.35))' : 'none',
                            }}
                          />
                          {/* Cluster Icon */}
                          <g transform="translate(-10, -10)">
                            <Layers
                              className={`h-5 w-5 ${isResolved ? 'text-[#B8935F]' : 'text-[#7E7972]'}`}
                              strokeWidth={1.8}
                            />
                          </g>
                          {/* Top Badge showing +N count */}
                          <rect
                            x={-22}
                            y={-34}
                            width={44}
                            height={15}
                            rx={7.5}
                            fill="#B8935F"
                          />
                          <text
                            x={0}
                            y={-23}
                            textAnchor="middle"
                            fill="#131114"
                            fontSize={8.5}
                            fontWeight={700}
                            style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                          >
                            +{node.clusteredNodes?.length || 'N'}
                          </text>
                        </g>
                      ) : (
                        /* Standard Single Node */
                        <g>
                          <rect
                            x={-24}
                            y={-24}
                            width={48}
                            height={48}
                            rx={6}
                            fill="#1C1A1E"
                            stroke={strokeColor}
                            strokeWidth={isSelected ? 2 : 1.5}
                            className="transition-all duration-300"
                            style={{
                              filter: isSelected ? 'drop-shadow(0 2px 8px rgba(184, 147, 95, 0.2))' : 'none',
                            }}
                          />

                          {/* Center Icon */}
                          {isExchange ? (
                            <g transform="translate(-8, -8)">
                              <Building2
                                className={`h-4 w-4 ${isResolved ? 'text-[#EDE8DE]' : 'text-[#7E7972]'}`}
                                strokeWidth={1.75}
                              />
                            </g>
                          ) : isOrigin ? (
                            <g transform="translate(-8, -8)">
                              <ShieldCheck
                                className={`h-4 w-4 ${isResolved ? 'text-[#3B6B54]' : 'text-[#7E7972]'}`}
                                strokeWidth={1.75}
                              />
                            </g>
                          ) : node.entityType === 'peeling' ? (
                            <g transform="translate(-8, -8)">
                              <Split
                                className={`h-4 w-4 ${isResolved ? 'text-[#B8935F]' : 'text-[#7E7972]'}`}
                                strokeWidth={1.75}
                              />
                            </g>
                          ) : (
                            <g transform="translate(-8, -8)">
                              <AlertOctagon
                                className={`h-4 w-4 ${
                                  isResolved
                                    ? node.risk === 'high'
                                      ? 'text-[#8C3B3B]'
                                      : 'text-[#B8935F]'
                                    : 'text-[#7E7972]'
                                }`}
                                strokeWidth={1.75}
                              />
                            </g>
                          )}
                        </g>
                      )}

                      {/* Hop Index Marker */}
                      <circle
                        cx={20}
                        cy={-20}
                        r={8}
                        fill="#131114"
                        stroke={isResolved ? '#B8935F' : '#2E2B32'}
                        strokeWidth={1}
                      />
                      <text
                        x={20}
                        y={-17}
                        textAnchor="middle"
                        fill={isResolved ? '#EDE8DE' : '#7E7972'}
                        fontSize={8}
                        fontWeight={600}
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {node.hopIndex}
                      </text>

                      {/* Pinned Marker for promoted nodes */}
                      {node.isPinned && (
                        <g transform="translate(-24, -24)">
                          <circle cx={4} cy={4} r={6} fill="#B8935F" />
                          <g transform="translate(1, 1)">
                            <Pin className="h-2 w-2 text-[#131114]" />
                          </g>
                        </g>
                      )}

                      {/* Node Label (Below) */}
                      <text
                        x={0}
                        y={36}
                        textAnchor="middle"
                        fill={isResolved ? '#EDE8DE' : '#7E7972'}
                        fontSize={10}
                        fontWeight={500}
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {node.label}
                      </text>

                      {/* Truncated Address or Fiat Amount */}
                      <text
                        x={0}
                        y={48}
                        textAnchor="middle"
                        fill="#A8A399"
                        fontSize={8.5}
                        style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                      >
                        {isCluster
                          ? node.fiatEquivalentINR || node.volumeOut
                          : `${node.address.slice(0, 6)}...${node.address.slice(-4)}`}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Bottom Left Legend */}
            <div className="absolute bottom-4 left-4 panel-dossier-subtle rounded p-2.5 flex flex-wrap items-center gap-4 text-[11px] text-[#A8A399] z-10 pointer-events-none">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-[#3B6B54]"></span>
                <span>Low Risk / Origin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-[#B8935F]"></span>
                <span>Medium / Layering</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded bg-[#8C3B3B]"></span>
                <span>High Risk / Mule</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#2E2B32] pl-3">
                <Building2 className="h-3 w-3 text-[#B8935F]" />
                <span>Exchange Target</span>
              </div>
              <div className="flex items-center gap-1.5 border-l border-[#2E2B32] pl-3">
                <Layers className="h-3 w-3 text-[#B8935F]" />
                <span>Aggregated Cluster</span>
              </div>
            </div>

            {/* Tracing Status Toast */}
            {isTracing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 panel-dossier rounded px-4 py-2 flex items-center gap-2.5 text-xs text-[#EDE8DE] z-20 shadow-md">
                <span className="h-2 w-2 rounded-full bg-[#B8935F] animate-pulse"></span>
                <span>Tracing Hop {activeHop + 1}... Resolving transaction hashes on-chain</span>
              </div>
            )}
          </div>
        ) : (
          /* HOP EVIDENCE LEDGER VIEW */
          <div className="flex-1 h-full overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#2A272D]">
              <div>
                <h3 className="font-serif text-lg text-[#EDE8DE]">
                  Chronological Hop Evidence Ledger
                </h3>
                <p className="text-xs text-[#A8A399]">
                  Verified on-chain transaction trail prepared for court submission.
                </p>
              </div>
              <span className="text-xs text-[#B8935F] bg-[#1C1A1E] px-2.5 py-1 rounded border border-[#2E2B32]">
                {currentCase.edges.length} Sequential Transactions
              </span>
            </div>

            <div className="panel-dossier rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#18161A] text-[#A8A399] border-b border-[#2A272D]">
                  <tr>
                    <th className="py-2.5 px-3 font-normal">Hop</th>
                    <th className="py-2.5 px-3 font-normal">Tx Hash</th>
                    <th className="py-2.5 px-3 font-normal">From → To</th>
                    <th className="py-2.5 px-3 font-normal">Amount</th>
                    <th className="py-2.5 px-3 font-normal">Delay</th>
                    <th className="py-2.5 px-3 font-normal">Timestamp (IST)</th>
                    <th className="py-2.5 px-3 font-normal">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#242227] text-[#EDE8DE]">
                  {currentCase.edges.map((edge) => {
                    const src = currentCase.nodes.find((n) => n.id === edge.source);
                    const tgt = currentCase.nodes.find((n) => n.id === edge.target);
                    const isHopActive = activeHop >= edge.hopIndex;

                    return (
                      <tr
                        key={edge.id}
                        className={`hover:bg-[#201D22] transition-colors cursor-pointer ${
                          isHopActive ? '' : 'opacity-60'
                        }`}
                        onClick={() => {
                          setSelectedEdge(edge);
                          setSelectedNode(null);
                        }}
                      >
                        <td className="py-3 px-3 font-medium">
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-[#242227] text-[10px] text-[#B8935F] border border-[#2E2B32]">
                            H{edge.hopIndex}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#EDE8DE]">
                              {edge.txHash.slice(0, 10)}...{edge.txHash.slice(-8)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(edge.txHash);
                              }}
                              className="text-[#7E7972] hover:text-[#EDE8DE]"
                            >
                              {copiedText === edge.txHash ? (
                                <Check className="h-3 w-3 text-[#3B6B54]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#A8A399]">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-[#EDE8DE]">{src?.label.split(' ')[0]}</span>
                            <ArrowRight className="h-3 w-3 text-[#7E7972]" />
                            <span className="text-xs text-[#EDE8DE]">{tgt?.label.split(' ')[0]}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-[#EDE8DE]">{edge.amountCrypto}</div>
                          <div className="text-[11px] text-[#A8A399]">{edge.amountINR}</div>
                        </td>
                        <td className="py-3 px-3 text-[#B8935F] font-medium">{edge.delayFromPrevious}</td>
                        <td className="py-3 px-3 text-[#A8A399]">{edge.timestamp}</td>
                        <td className="py-3 px-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEdge(edge);
                              setSelectedNode(null);
                            }}
                            className="text-[11px] text-[#B8935F] hover:underline"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Selected Node / Edge / Cluster Inspection Drawer */}
        {(selectedNode || selectedEdge) && !isEmptyState && (
          <div className="absolute right-4 top-4 bottom-4 w-84 sm:w-96 panel-dossier rounded p-4 flex flex-col z-20 shadow-xl overflow-y-auto border border-[#B8935F]/20">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#2A272D]">
              <span className="text-[11px] text-[#B8935F] font-medium uppercase tracking-wider">
                {selectedNode?.entityType === 'cluster'
                  ? 'Cluster Intelligence'
                  : selectedNode
                  ? 'Wallet Inspection'
                  : 'Transaction Telemetry'}
              </span>
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setSelectedEdge(null);
                }}
                className="text-[#7E7972] hover:text-[#EDE8DE] text-xs px-1.5 py-0.5 rounded hover:bg-[#242227]"
              >
                ✕ Close
              </button>
            </div>

            {/* CLUSTER NODE INSPECTION DRAWER VIEW */}
            {selectedNode?.entityType === 'cluster' ? (
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="px-1.5 py-0.5 rounded bg-[#B8935F]/20 text-[#B8935F] text-[10px] font-semibold tracking-wide flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      AGGREGATED FAN-OUT CLUSTER
                    </span>
                    <span className="text-[11px] text-[#A8A399]">Hop {selectedNode.hopIndex}</span>
                  </div>
                  <h4 className="font-serif text-base text-[#EDE8DE] font-normal">
                    {selectedNode.label}
                  </h4>
                  <p className="text-[11px] text-[#A8A399] mt-1 leading-relaxed">
                    Auto-clustered to prevent visual density stacking in Hop {selectedNode.hopIndex}. Identify any wallet below and pin it to render individually on the main canvas.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#18161A] p-2 rounded border border-[#242227]">
                    <div className="text-[10px] text-[#7E7972]">Combined Flow</div>
                    <div className="text-xs font-semibold text-[#EDE8DE]">{selectedNode.volumeOut}</div>
                    <div className="text-[10px] text-[#B8935F]">{selectedNode.fiatEquivalentINR}</div>
                  </div>
                  <div className="bg-[#18161A] p-2 rounded border border-[#242227]">
                    <div className="text-[10px] text-[#7E7972]">Grouped Wallets</div>
                    <div className="text-xs font-semibold text-[#EDE8DE]">
                      {selectedNode.clusteredNodes?.length || 0} Wallets
                    </div>
                    <div className="text-[10px] text-[#7E7972]">{selectedNode.txCount} Total Hops</div>
                  </div>
                </div>

                {/* Constituent Wallets List with "Pin to graph" action */}
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#7E7972] mb-1.5">
                    <span>Grouped Wallets ({selectedNode.clusteredNodes?.length || 0})</span>
                    <span>Canvas Promotion</span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {selectedNode.clusteredNodes?.map((wallet, idx) => (
                      <div
                        key={wallet.id || idx}
                        className="p-2.5 rounded bg-[#18161A] border border-[#242227] hover:border-[#3A363E] transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[11px] text-[#EDE8DE] font-medium">
                            {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleCopy(wallet.address)}
                              className="text-[#7E7972] hover:text-[#EDE8DE] p-0.5"
                              title="Copy address"
                            >
                              {copiedText === wallet.address ? (
                                <Check className="h-3 w-3 text-[#3B6B54]" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                            <button
                              onClick={() => onPinNode?.(wallet.address)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#2A272D] hover:bg-[#B8935F] hover:text-[#131114] text-[10px] text-[#B8935F] font-medium transition-colors"
                              title="Pull out of cluster and render individually on graph"
                            >
                              <Pin className="h-2.5 w-2.5" />
                              <span>Pin to Graph</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-1 text-[10px] text-[#A8A399]">
                          <span>Vol: {wallet.volumeOut || wallet.volumeIn} ({wallet.fiatEquivalentINR})</span>
                          <span
                            className={`capitalize font-medium ${
                              wallet.risk === 'high'
                                ? 'text-[#8C3B3B]'
                                : wallet.risk === 'low'
                                ? 'text-[#3B6B54]'
                                : 'text-[#B8935F]'
                            }`}
                          >
                            {wallet.risk} Risk
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedNode ? (
              /* REGULAR NODE INSPECTION DRAWER VIEW */
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-base text-[#EDE8DE] font-normal">
                      {selectedNode.label}
                    </h4>
                    {selectedNode.isPinned && (
                      <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[#B8935F]/20 text-[#B8935F] border border-[#B8935F]/40 font-medium">
                        <Pin className="h-2.5 w-2.5" />
                        Pinned to Canvas
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between bg-[#161418] p-2 rounded border border-[#2A272D]">
                    <span className="text-[#EDE8DE] text-[11px] break-all">
                      {selectedNode.address}
                    </span>
                    <button
                      onClick={() => handleCopy(selectedNode.address)}
                      className="ml-2 text-[#7E7972] hover:text-[#EDE8DE]"
                    >
                      {copiedText === selectedNode.address ? (
                        <Check className="h-3 w-3 text-[#3B6B54]" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#18161A] p-2 rounded border border-[#242227]">
                    <div className="text-[10px] text-[#7E7972]">Balance Remaining</div>
                    <div className="text-xs font-semibold text-[#EDE8DE]">{selectedNode.balance}</div>
                  </div>
                  <div className="bg-[#18161A] p-2 rounded border border-[#242227]">
                    <div className="text-[10px] text-[#7E7972]">Total Dispersed</div>
                    <div className="text-xs font-semibold text-[#EDE8DE]">{selectedNode.volumeOut}</div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-[#242227]">
                  <div className="flex justify-between text-[#A8A399]">
                    <span>Entity Classification</span>
                    <span className="text-[#EDE8DE] capitalize font-medium">
                      {selectedNode.entityType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A8A399]">
                    <span>Risk Severity</span>
                    <span
                      className={`capitalize font-medium ${
                        selectedNode.risk === 'high'
                          ? 'text-[#8C3B3B]'
                          : selectedNode.risk === 'low'
                          ? 'text-[#3B6B54]'
                          : 'text-[#B8935F]'
                      }`}
                    >
                      {selectedNode.risk}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#A8A399]">
                    <span>Hop in Trail</span>
                    <span className="text-[#EDE8DE]">Hop {selectedNode.hopIndex}</span>
                  </div>
                  <div className="flex justify-between text-[#A8A399]">
                    <span>First Detected</span>
                    <span className="text-[#EDE8DE]">{selectedNode.firstSeen}</span>
                  </div>
                  {selectedNode.countryOrCluster && (
                    <div className="flex justify-between text-[#A8A399]">
                      <span>Cluster Intelligence</span>
                      <span className="text-[#B8935F] text-right font-medium">
                        {selectedNode.countryOrCluster}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[11px] text-[#7E7972] mb-1.5">Forensic Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selectedNode.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="rounded bg-[#201D22] border border-[#2A272D] px-2 py-0.5 text-[10px] text-[#EDE8DE]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {selectedNode.entityType === 'exchange' && (
                  <div className="pt-2">
                    <button
                      onClick={onOpenNotice}
                      className="w-full rounded bg-[#B8935F] py-2 text-xs font-medium text-[#131114] hover:bg-[#CFAC78] transition-colors"
                    >
                      Proceed to Section 91 Notice
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* EDGE INSPECTION VIEW */}
            {selectedEdge && (
              <div className="space-y-3.5 text-xs">
                <div>
                  <h4 className="font-serif text-base text-[#EDE8DE] font-normal">
                    Hop {selectedEdge.hopIndex} Transaction
                  </h4>
                  <div className="mt-1 bg-[#161418] p-2 rounded border border-[#2A272D]">
                    <div className="text-[10px] text-[#7E7972]">Transaction Hash</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[#EDE8DE] text-[11px] break-all">
                        {selectedEdge.txHash}
                      </span>
                      <button
                        onClick={() => handleCopy(selectedEdge.txHash)}
                        className="ml-2 text-[#7E7972] hover:text-[#EDE8DE]"
                      >
                        {copiedText === selectedEdge.txHash ? (
                          <Check className="h-3 w-3 text-[#3B6B54]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#18161A] p-2 rounded border border-[#242227]">
                    <div className="text-[10px] text-[#7E7972]">Transfer Value</div>
                    <div className="text-xs font-semibold text-[#EDE8DE]">{selectedEdge.amountCrypto}</div>
                    <div className="text-[10px] text-[#B8935F]">{selectedEdge.amountINR}</div>
                  </div>
                  <div className="bg-[#18161A] p-2 rounded border border-[#242227]">
                    <div className="text-[10px] text-[#7E7972]">Delay from Prior Hop</div>
                    <div className="text-xs font-semibold text-[#EDE8DE]">{selectedEdge.delayFromPrevious}</div>
                    <div className="text-[10px] text-[#7E7972]">Gas: {selectedEdge.gasFee}</div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-[#242227]">
                  <div className="flex justify-between text-[#A8A399]">
                    <span>Timestamp</span>
                    <span className="text-[#EDE8DE]">{selectedEdge.timestamp}</span>
                  </div>
                  {selectedEdge.method && (
                    <div className="flex justify-between text-[#A8A399]">
                      <span>Execution Method</span>
                      <span className="text-[#EDE8DE]">{selectedEdge.method}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#A8A399]">
                    <span>Resolved in Investigation</span>
                    <span className="text-[#3B6B54] font-medium">Chain Confirmed</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );

  return isFullscreen ? createPortal(graphContent, document.body) : graphContent;
}
