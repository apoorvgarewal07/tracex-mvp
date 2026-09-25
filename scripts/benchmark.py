#!/usr/bin/env python3
"""
Performance & latency benchmark suite for CryptoFraud Trace...
Verifies targets:
- 10 hops trace < 10s
- 50 hops trace < 25s
- 100 hops trace < 30s
- PDF freeze notice generation < 5s
"""
import sys
import os
import time
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.blockchain.tracer import BlockchainTracer
from backend.blockchain.rpc_client import BlockchainClient
from backend.neo4j.client import Neo4jClient
from backend.legal.notice_generator import NoticeGenerator
from backend.database.schemas import Trace

async def benchmark_tracer(hops_target: int, max_sec: float):
    rpc = BlockchainClient()
    neo4j = Neo4jClient()
    tracer = BlockchainTracer(rpc, neo4j, max_hops=hops_target, timeout_seconds=int(max_sec) + 5)

    test_addr = f"0x{'beef'*9}{hops_target:04d}"
    t0 = time.time()
    res = await tracer.trace(test_addr, f"bench-trace-{hops_target}")
    elapsed = time.time() - t0

    hops_found = res.get('hops_count', 0)
    passed = elapsed < max_sec
    status_str = "✓ PASS" if passed else "✗ FAIL"
    print(f"[{status_str}] Trace {hops_target:3d} hops target: {elapsed:6.2f}s (Threshold: < {max_sec:.1f}s | Hops discovered: {hops_found})")
    return passed

def benchmark_pdf_generation():
    generator = NoticeGenerator()
    dummy_trace = {
        'id': 'bench-trace-pdf-001',
        'complaint_id': 'NCRP-2024-BENCH',
        'source_wallet': '0x1234567890abcdef1234567890abcdef12345678',
        'hops_count': 12,
        'risk_score': 0.94,
        'hops_data': {
            'hops': [
                {'from': '0x1234567890abcdef1234567890abcdef12345678', 'to': '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'value': '10.5', 'asset': 'ETH', 'tx_hash': '0x9999'}
            ],
            'identified_exchanges': [
                {'address': '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', 'name': 'Binance', 'entity_type': 'EXCHANGE'}
            ]
        }
    }
    t0 = time.time()
    pdf_bytes = generator.generate(dummy_trace, "Binance")
    elapsed = time.time() - t0
    passed = elapsed < 5.0 and len(pdf_bytes) > 500
    status_str = "✓ PASS" if passed else "✗ FAIL"
    print(f"[{status_str}] PDF Freeze Notice Generation: {elapsed:6.2f}s (Threshold: < 5.0s | Size: {len(pdf_bytes)} bytes)")
    return passed

async def main():
    print("==========================================================")
    print(" CRYPTOFRAUD TRACE - FORENSIC ENGINE BENCHMARK SUITE      ")
    print("==========================================================")
    
    p1 = await benchmark_tracer(10, 10.0)
    p2 = await benchmark_tracer(50, 25.0)
    p3 = await benchmark_tracer(100, 30.0)
    p4 = benchmark_pdf_generation()

    print("==========================================================")
    if all([p1, p2, p3, p4]):
        print("✓ ALL BENCHMARK PERFORMANCE TARGETS SATISFIED!")
    else:
        print("⚠ Some benchmarks exceeded target latency thresholds.")
    print("==========================================================")

if __name__ == '__main__':
    asyncio.run(main())
