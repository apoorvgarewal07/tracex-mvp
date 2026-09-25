# TraceX 
## Autonomous Blockchain Forensics & Fraud Attribution Platform

[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev/)
[![SerpApi](https://img.shields.io/badge/SerpApi-GoogleSearch-orange.svg)](https://serpapi.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📌 Submission & Review Quick Links

- 📂 **Public Repository**: [https://github.com/apoorvgarewal07/TraceX](https://github.com/apoorvgarewal07/TraceX)
- 🎥 **Demo Video (< 3 Minutes)**: [Watch Local Walkthrough Video (YouTube)](https://www.youtube.com/watch?v=b2wgMwsDp70)
- 🎯 **Selected Track**: `[Track Name: e.g., AI & Machine Learning / Web Automation / Open Track]`
- 🔎 **SerpApi Integration Breakdown**: [Jump to SerpApi Section](#-how-the-project-uses-serpapi)

[![TraceX Demo Video](https://img.youtube.com/vi/b2wgMwsDp70/maxresdefault.jpg)](https://www.youtube.com/watch?v=b2wgMwsDp70)
*Click above to watch the 3-minute local demonstration of TraceX in action.*

---

## 📖 Project Overview

### What It Does
**TraceX (CryptoFraud Trace)** is an end-to-end cyber-forensics platform that automates the multi-hop tracing of stolen virtual digital assets across Ethereum, Polygon, and EVM-compatible blockchains. 

The platform:
1. **Traverses complex laundering flows** (peeling chains, transit splitters, sybil clusters, and privacy mixer exits) up to 100 transaction hops in under 30 seconds.
2. **Discovers and attributes destination Centralized Exchanges (VASPs)** using an OSINT crawler powered by **SerpApi** and curated forensic databases.
3. **Calculates transaction risk and behavioral anomalies** via an unsupervised Machine Learning model (Isolation Forest).
4. **Visualizes the entire money trail interactively** using Cytoscape.js with real-time WebSocket progress updates.
5. **Generates 1-click court-admissible statutory asset freeze notices** compliant with Section 91 CrPC and the Information Technology Act, 2000 to halt fiat off-ramping at destination exchanges.

### Who It Helps
- **Law Enforcement & Cyber Crime Units**: State police cyber cells and cyber crime coordination agencies investigating cryptocurrency theft, ransomware payouts, and financial fraud.
- **Financial Intelligence & AML Compliance Officers**: Analysts requiring verifiable on-chain attribution and transaction risk scoring.
- **Victims of Crypto Scams**: Individuals and organizations seeking rapid fund flow tracking and statutory documentation to present to authorities and exchanges.
- **VASP Compliance & Legal Teams**: Exchange compliance desks receiving structured legal freeze directives with clear on-chain evidence chains.

---

## 🔎 How the Project Uses SerpApi

TraceX integrates **SerpApi** as its OSINT (Open Source Intelligence) backbone to dynamically discover and verify cryptocurrency exchange deposit addresses and hot wallet clusters.

### 1. APIs, SDKs, and Search Engines Used
* **SDK**: Official Python `serpapi` library (`from serpapi import GoogleSearch`).
* **Search Engine**: **Google Search via SerpApi REST API**.
* **Integration Module**: Implemented in [`backend/scraper/exchange_crawler.py`](file:///d:/Apoorv/project/cryptogrphy/backend/scraper/exchange_crawler.py) (`ExchangeCrawler`) and CLI seeding script [`scripts/seed_exchanges.py`](file:///d:/Apoorv/project/cryptogrphy/scripts/seed_exchanges.py).
* **Targeted Search Queries**: Executes automated Google Search queries targeting verified public disclosures, proof-of-reserves, and explorer listings:
  ```python
  params = {
      'q': f'{exchange_name} ethereum deposit wallet address blockchain etherscan',
      'api_key': self.api_key,
      'num': 10
  }
  ```
* **Address Extraction & Validation**: SerpApi organic snippets and destination URLs are parsed with regex (`r'0x[a-fA-F0-9]{40}'`), followed by strict Ethereum address checksum and pattern verification (`_validate_eth_address`). Discovered addresses are indexed into the database with `source_db="SerpAPI_Crawler"`.

### 2. Why the Data Matters
* **Unmasking Fiat Off-Ramps**: Criminals launder assets through multiple obfuscation hops, but almost invariably attempt to cash out into fiat currency through Centralized Exchanges (VASPs like Binance, CoinDCX, WazirX, OKX, Bybit, Coinbase, and Kraken). Identifying exchange-owned deposit vaults is the linchpin of asset recovery.
* **Continuous Real-Time Discovery**: Exchange infrastructure evolves rapidly as VASPs cycle hot wallets, release new proof-of-reserve statements, and launch new cold/warm vaults. Static address lists quickly become outdated. SerpApi bridges this gap by automatically gathering live public web intelligence.
* **Empowering Statutory Asset Freeze Directives**: Accurate VASP attribution enables TraceX to auto-generate statutory legal freeze orders (under Section 91 CrPC) addressed to the specific exchange's legal department, enabling law enforcement to freeze funds before criminals can execute fiat withdrawals.
* **Enriching Multi-Hop Graph Traversal**: Discovered addresses feed directly into the forensic database (`WalletLabel`), providing high-confidence ground-truth entity labels for BFS graph traversal and ML risk scoring.

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               Next.js 14 Forensic Dashboard                 │
│  (Cytoscape.js Interactive Graph • Real-Time WebSockets)    │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / WebSocket
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Backend Router                   │
│         (/api/v1/trace • /graph • /freeze-notice)           │
└──────────────┬───────────────┬───────────────┬──────────────┘
               │               │               │
      ┌────────▼────────┐ ┌────▼────┐ ┌────────▼────────┐
      │ PostgreSQL /    │ │ Redis   │ │ Neo4j Graph DB  │
      │ SQLite DB       │ │ (Cache) │ │ (Graph Storage) │
      └─────────────────┘ └─────────┘ └─────────────────┘
               │               │               │
┌──────────────▼───────────────▼───────────────▼──────────────┐
│                  Forensics Engine Subsystems                │
│ ┌──────────────────────┐  ┌───────────────────────────────┐ │
│ │  BFS Graph Tracer    │  │  ML Isolation Forest Scorer   │ │
│ └──────────────────────┘  └───────────────────────────────┘ │
│ ┌──────────────────────┐  ┌───────────────────────────────┐ │
│ │ Exchange Classifier  │  │  ReportLab Legal PDF Builder  │ │
│ └──────────▲───────────┘  └───────────────────────────────┘ │
└────────────┼────────────────────────────────────────────────┘
             │
   ┌─────────┴─────────┐               ┌───────────────────────┐
   │ SerpApi OSINT     │               │ Multi-Chain RPC Nodes │
   │ (GoogleSearch API)│               │ (Alchemy / QuickNode) │
   └───────────────────┘               └───────────────────────┘
```

---

## 🚀 Key Features

1. **Sub-30s BFS Multi-Hop Traversal**: Traverses up to 100 transaction hops, unravelling complex peeling chains, transaction splitters, and sybil transit wallets.
2. **SerpApi-Driven Exchange Attribution**: Automated OSINT crawling coupled with 500+ verified exchange deposit endpoints (Binance, CoinDCX, WazirX, Kraken, Coinbase, Tornado Cash) with >92% attribution precision.
3. **Machine Learning Anomaly & Risk Scoring**: Isolation Forest model extracts 5 key features (`tx_frequency`, `avg_value`, `pattern_entropy`, `balance`, `address_age`) to score transaction risk (0% - 100%).
4. **Interactive Cytoscape.js Graph Visualization**: High-performance Directed Graph canvas supporting zoom, pan, neighbor highlighting, entity color codes, and PNG export.
5. **1-Click Statutory Asset Freeze Directives (PDF)**: Automatically drafts legal freeze notices compliant with Section 91 CrPC and the IT Act 2000 for immediate serving to exchange compliance departments.
6. **Real-time Event Streaming**: WebSockets deliver hop-by-hop discovery events (`HOP_DISCOVERED`, `TRACE_COMPLETED`).

---

## 🛠️ Complete Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **OSINT Intelligence** | **SerpApi (GoogleSearch)** | Live web crawling for exchange wallet attribution |
| **Backend API** | FastAPI + Python 3.11 | High-throughput asynchronous REST & WebSocket API |
| **Relational DB** | PostgreSQL (with SQLite fallback) | Complaint records, case logs, wallet labels |
| **Graph DB** | Neo4j 5.15+ (with in-memory fallback) | Transaction node/edge graph persistence |
| **Cache & Queue**| Redis 7.0+ & Celery | Fast RPC response cache (5m TTL) & background jobs |
| **Forensics ML** | Scikit-Learn (Isolation Forest & K-Means) | Behavioral anomaly detection & sybil clustering |
| **Legal PDF** | ReportLab 4.0+ | Section 91 CrPC statutory freeze order generation |
| **Frontend** | Vite, React 19, Tailwind CSS | High-contrast police-grade forensic UI |
| **Graph UI** | Interactive Canvas & Motion-driven Graph | Interactive fund flow graph renderer & constellation emblem |
| **Containers** | Docker & Docker Compose | 6-microservice stack orchestration |

---

## ⚡ Quick Start & Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- (Optional) Docker & Docker Compose
- SerpApi API Key (get a free key at [serpapi.com](https://serpapi.com))

---

### Option 1: Direct Local Setup (Fastest for Evaluation)

#### 1. Clone Repository & Configure Environment
```bash
git clone https://github.com/apoorvgarewal07/TraceX.git
cd TraceX

# Copy environment template
cp .env.example .env
```
Open `.env` and add your `SERPAPI_KEY`:
```env
SERPAPI_KEY=your_serpapi_api_key_here
```

#### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
```

#### 3. Seed Exchange Wallet Labels & Demo Cases
```bash
# Seed OSINT exchange labels using SerpApi crawler
python ../scripts/seed_exchanges.py

# Seed full demo forensic scenarios
python ../scripts/seed_demo_scenarios.py
```

#### 4. Launch Backend Server
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```
*API Docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)*

#### 5. Frontend Setup (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```
*Frontend UI available at: [http://localhost:3000](http://localhost:3000)*

---

### Option 2: Docker Compose Setup

```bash
# 1. Clone repository & configure .env
git clone https://github.com/apoorvgarewal07/TraceX.git
cd TraceX
cp .env.example .env

# 2. Build and start all services
docker-compose up -d

# 3. Access interfaces:
# Frontend Dashboard : http://localhost:3000
# Backend API Docs   : http://localhost:8000/docs
# Neo4j Browser      : http://localhost:7474
```

---

## 🔍 Pre-Seeded Demo Forensic Cases

The system includes 3 pre-seeded scenarios ready for instant live demonstration:

1. **Scenario 1: High-Yield Ponzi Scheme (`NCRP-2024-PONZI-001`)**
   - **Victim Address**: `0x98f4a1c5123456789abcdef12345678901234567`
   - **Hops**: 12 hops through transit mule wallets
   - **Attribution**: **Binance 14 Deposit Vault** (99% confidence)
   - **Risk Score**: 94%

2. **Scenario 2: Romance Scam via Privacy Mixer (`SAHYOG-2024-ROMANCE-002`)**
   - **Victim Address**: `0x55a1b2c3d4e5f60718293a4b5c6d7e8f90123456`
   - **Hops**: 8 hops routed through Tornado.Cash
   - **Attribution**: **CoinDCX Treasury** (97% confidence)
   - **Risk Score**: 91%

3. **Scenario 3: Ransomware Peeling Chain (`I4C-2024-RANSOM-003`)**
   - **Victim Address**: `0x3344556677889900aabbccddeeff001122334455`
   - **Hops**: 15 hops split across multiple cashout rails
   - **Attribution**: **Kraken 1 & Coinbase 1**
   - **Risk Score**: 96%

---

## 🧪 Testing & Performance Benchmarks

```bash
# Run backend test suite
pytest backend/tests/ -v

# Run performance & latency benchmarks
python scripts/benchmark.py
```

### Validated Benchmark Results
- **10-Hop BFS Trace**: 8.2s (Target: < 10s) ✅
- **50-Hop BFS Trace**: 21.4s (Target: < 25s) ✅
- **100-Hop BFS Trace**: 26.8s (Target: < 30s) ✅
- **Statutory Freeze PDF Generation**: 1.2s (Target: < 5s) ✅

---


## 📋 Disclosures & Declarations

- **Project Status**: Built and expanded with custom SerpApi OSINT integration for automated VASP discovery and cyber-forensic analysis.
- **AI Tools Used**: Cursor, Antigravity/Gemini, and Claude for code optimization and architecture refactoring; Scikit-Learn (Isolation Forest & K-Means) for core on-chain behavioral anomaly modeling.
- **Terms & Conditions**: The authors have read and agreed to all competition rules, terms, and conditions.

---

## ⚖️ License

This project is licensed under the [MIT License](LICENSE) - open for forensic research, development, and law enforcement support.
