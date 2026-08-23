# Tantor AI Sizer

Build "Tantor Gen AI Sizer", an internal presales web application for Translab Technologies that sizes GPU and infrastructure deployments for the Tantor on-premise governed AI platform, and compares on-premise cost against AWS, Azure, GCP and OCI. Users are presales engineers in India. ALL MONEY IN THE APPLICATION IS INR: every figure shown to a user,
on-premise and cloud alike, is displayed in Indian rupees using Indian digit grouping, expressed in Lakh (L)
and Crore (Cr) with a rupee symbol. Cloud list rates are sourced in USD per GPU-hour and must be converted to
INR at the fx rate on the rate card at the point of calculation; the USD figure may appear only as a small
secondary reference beside its INR value in the Cloud Bill of Quantities, never as the headline number.
No screen, chart, table or export presents a total, subtotal or unit cost in USD.

TECH REQUIREMENTS

React + TypeScript. Tailwind for styling.

The calculation engine must be PURE FUNCTIONS in src/engine/ with zero UI imports, fully unit-testable.

All reference data (models, GPUs, chassis templates, precisions, task types, regions, cloud instance mappings, rate card) must live in src/data/*.json files, never hard-coded in components. Show a rate card version stamp ("Rates: Aug 2026") in the footer of every page.

Use Supabase for auth and saved scenarios (added in a later prompt; structure for it now).

BRAND (Tantor product identity; apply exactly)

Palette: deep purple #3D145F (hero accent, headings, nav), rose #DF678C (primary accent, active states, key numbers), olive #707019 (success/PASS), deep blue #22229A (supporting), pale lavender #F4F0F8 (page background), white cards with #E3DAEE borders.

Typography: Lexend for headings and numerals, Lato for body. UK English throughout. Never use em dashes.

Currency: INR with Indian digit grouping (12,34,567), amounts in Lakh (L) and Crore (Cr).

Header: [TANTOR LOGO PLACEHOLDER: I will upload logo files; reserve a 140x36 px slot top-left of the sidebar].

APP SHELL

Left sidebar navigation: Home, then numbered steps 1 Workload, 2 Model & Platform, 3 Infrastructure, 4 Environments, 5 Results, plus Assumptions and Admin.

Persistent "result strip" pinned across the top of every page showing: Production GPUs, All-environment physical GPUs, Total nodes, Binding constraint, On-premise 3-year TCO, Delta vs best cloud, INR per million tokens. It recomputes live on every input change.

DATA MODEL (create these JSON files with this exact content)

tasks.json: [{name, inTok, outTok, mult}] with rows: Summarisation 20000/400/1.0; Generation 1500/2500/1.0; Extraction-Classification 800/150/1.0; RAG Q&A 4000/600/1.0; Reasoning-Agentic 6000/1500/4.0.

units.json: Tokens 1; Words 1.33; Pages 665; KB 250; MB 256000; GB 262144000; Characters 0.25 (tokens per unit).

models.json: 25 open-weight models with {name, totalB, activeB, kv1k}: Llama 3.1 8B (8/8/0.13); Llama 3.3 70B (70/70/0.66); Llama 3.1 405B (405/405/1.03); Llama 4 Scout 109B MoE (109/17/0.35); Llama 4 Maverick 400B MoE (400/17/0.35); Mistral Large 3 675B MoE (675/41/0.60); Mistral Large 2 123B (123/123/0.75); Mistral Small 24B (24/24/0.30); Ministral 3 8B (8/8/0.12); Ministral 3 3B (3/3/0.05); Mixtral 8x7B MoE (47/13/0.50); Command A 111B (111/111/0.55); Command R+ 104B (104/104/0.60); Gemma 4 27B (27/27/0.30); Gemma 4 12B (12/12/0.18); Gemma 3 27B (27/27/0.35); Gemma 3 12B (12/12/0.20); Gemma 3 4B (4/4/0.08); Phi-4 14B (14/14/0.20); Phi-4 Mini 3.8B (3.8/3.8/0.06); Granite 4.1 Small 32B hybrid MoE (32/9/0.15); Granite 4.1 Micro 3B (3/3/0.05); gpt-oss-120b MoE (117/5.1/0.20); gpt-oss-20b MoE (21/3.6/0.10); Custom fine-tuned (70/70/0.66, user-editable). No Chinese-origin models. No API-only models.

gpus.json: 18 GPUs with {name, vram, usable:0.9, idx, cardL, watts, cloudRate:{aws,azure,gcp,oci}, avail}: NVIDIA Rubin SXM (288, 3.5, 75, 1800, 20/22/21/18, "2026-27 roadmap"); B300 SXM (288, 2.8, 60, 1400, 16/18/17/15, "Limited GA"); B200 SXM (192, 2.4, 48, 1200, 13/16/15/13, GA); H200 SXM (141, 1.4, 33, 800, 8/13.5/12/10.5, GA); H200 NVL PCIe (141, 1.3, 30, 600, 7.5/12.5/11/10, GA); H100 SXM5 (80, 1.0, 28, 750, 6.88/12.29/11.06/10, GA); H100 NVL PCIe (94, 1.15, 30, 500, 7.5/12/11/9.5, GA); H100 PCIe (80, 0.6, 24, 500, 5.5/9.5/8.5/8, GA); A100 SXM4 80GB (80, 0.5, 17, 550, 4.1/3.67/3.28/3.05, GA); A100 PCIe 80GB (80, 0.45, 15, 400, 3.6/3.2/2.9/2.7, GA); L40S PCIe (48, 0.21, 9, 500, 1.86/2.2/2.0/3.5, GA); AMD MI455X (432, 3.2, 75, 1800, 16/16/16/15, roadmap); MI430X (432, 2.6, 65, 1600, 14/14/14/13, roadmap); MI355X (288, 2.0, 38, 1400, 10/10/10/9.5, GA); MI350X (288, 1.8, 32, 1000, 9/9/9/8.5, GA); MI350P (288, 1.6, 30, 850, 8/8/8/7.5, Limited GA); MI325X (256, 1.3, 24, 1000, 7/7/7/6.5, GA); MI300X (192, 1.1, 20, 750, 6/6/6/6, GA). cardL is the GPU card price in INR Lakh.

precisions.json: FP32 {bytes:4, tput:0.25}; FP16 {2, 0.5}; BF16 {2, 0.5}; FP8 {1, 1.0}; INT8 {1, 1.0}; INT4-GPTQ-AWQ {0.5, 1.3}.

templates.json: 7 GPU chassis + 1 services node, {name, gpn, cores, ram, nvmeTB, nic, priceL, watts}: 1-way PCIe (1, 16, 128, 3.84, "2x 25G", 6, 350); 2-way PCIe (2, 32, 256, 7.68, "2x 25G", 9, 450); 2-way NVLink (2, 32, 256, 7.68, "2x 100G", 11, 500); 4-way PCIe (4, 64, 512, 15.36, "2x 100G", 18, 800); 4-way NVLink (4, 64, 512, 15.36, "4x 200G", 24, 900); 8-way SXM5 (8, 112, 2048, 30.72, "8x 400G", 45, 2000); 8-way AMD OAM (8, 112, 2048, 30.72, "8x 400G", 45, 2000); Services node (0, 64, 512, 7.68, "2x 25G", 14, 450).

rates.json (general and infra factors, all user-adjustable on the Assumptions page): peakFactor 1.3; servingEff 0.7; headroom 0.25; ancillary 0.25; schedOverhead 0.05; haGpus 1; fx 88; tariff 8.5; utilisation 0.6; hoursMonth 730; cloudUplift 0.15; amcPct 0.10; manpowerL 24; facilitiesL 12; committedFactor 0.5; inflightLatency 20; prefillMult 8; weightOverhead 1.1; calibK 49000; streamsPerGpu 16; concRatio 0.10; installPct 0.05; contPct 0.10; implOneL 25; nvaieLperGpu 0; k8sLicLperNode 0; k8sOverhead 0.08; refresh 0.25; workDays 250; docsPerUser 50; docMB 0.5; embedDims 1024; chunkTokens 512; bytesPerToken 4; logOverhead 3; indexOverhead 1.8; growth 1.5; raid 1.5; ramMult 2; osReserve 32; cloudCpuHr 3.0 (USD per hour, a source input converted to INR like all cloud rates); ethPerNodeL 1.5; fabricBaseL 40; fabricPerNodeL 8; applianceLperTB 2.0; migPartitions 4; oversub 2.0.

CALCULATION ENGINE (src/engine/, pure functions; implement exactly)
Token engine per use case: inTok = size x unitTokens if size+unit given, else task default; same for outTok. conc = concurrent override, else totalUsers x concRatio. avgRps = conc x reqPerUserHr / 3600. peakRps = avgRps x peakFactor. prefill = peakRps x inTok x mult. decode = peakRps x outTok x mult. inflight = peakRps x inflightLatency. Sum across use cases.
Sizing: decodeTps = gpu.idx x calibK / model.activeB x precision.tput. weights = totalB x precision.bytes x weightOverhead (GB). avgTok = (prefillTot + decodeTot) / peakRpsTot. kvTot = inflightTot x avgTok/1000 x kv1k. memGpus = ceil((weights + kvTot) / (vram x usable)). decGpus = ceil(decodeTot / (decodeTps x servingEff)). preGpus = ceil(prefillTot / (decodeTps x prefillMult x servingEff)). base = max of the three; name the binding constraint. Chain: withHead = ceil(base x 1.25); withAnc = ceil(withHead x 1.25); withSched = ceil(withAnc x 1.05); prodGpus = withSched + haGpus. TTFT est ms = (prefillTot/peakRpsTot) / (decodeTps x prefillMult) x 1000, PASS if <= target. TPOT est ms = 1000 / (decodeTps / streamsPerGpu), PASS if <= target.
Infra: corpus input accepts GB or TB (unit toggle; store GB internally). If blank, estimate = effectiveTotalUsers x docsPerUser x docMB / 1024, flagged "ESTIMATED, confirm with client". docs = corpusGB x 1024 / docMB. vectors = corpusGB x 1e9 / bytesPerToken / chunkTokens. idxRAM GB = vectors x embedDims x 4 x indexOverhead / 1e9. ingestion docs/day = docs x refresh / workDays (runs on GPU nodes; no ingestion servers). logDay GB = avgRpsTot x 86400 x avgTok x bytesPerToken x logOverhead / 1e9. logRet = logDay x 30.4 x retentionMonths. weightsDisk = weights x versions. storageTB = ceil to 0.5 of (logRet + corpusGB x 1.2 + idxRAM) x growth x raid / 1024. Object storage is appliance-based (Dell, IBM, NetApp).
Nodes: suggest template from GPU name (contains AMD -> 8-way AMD OAM; SXM -> 8-way SXM5; NVL -> 2-way NVLink; else 4-way PCIe); user can override; show MISMATCH warning when GPU form factor cannot fit the chosen chassis. ramReq = gpn x vram x ramMult + osReserve; flag if template RAM below. NVMe check: nvmeTB x 1024 >= weightsDisk. Fabric required when weights > gpn x vram x usable (model spans nodes; adds 400G IB/RoCE for Prod and DR).
Environments (Prod, Dev, UAT, DR): Dev/UAT/DR scale from withSched (the pre-HA figure) by user percentages (defaults 25/35/100). Prod GPUs = prodGpus (includes HA). DR adds haGpus only if drHA toggle on. Dev/UAT never HA. Virtualisation toggle: Dev/UAT physical GPUs = ceil(logical / migPartitions). Nodes per env = ceil(physical / gpn). Vector DB nodes: pre-HA count = max(1, ceil(idxRAM / (512 x 0.7))); Prod shows max(2, pre-HA); Dev/UAT 1; DR = if drHA max(2, ceil(preHA x drPct)) else max(1, ceil(preHA x drPct)). Platform nodes: Prod 3, Dev/UAT 1, DR drHA?3:1. Data services (relational DB + queues): Prod 2, Dev/UAT 1, DR drHA?2:1. Storage per env scales by the same percentages, ceil 0.5 TB.
VM catalogue (9 roles with per-env counts; LLM inference VM = 1 per physical GPU with RAM = 2 x vram; embedding, vector DB, K8s control, observability, relational DB, message queue, API gateway, Tantor platform VMs; HA pairs in Prod, DR conditional). Capacity check per env: services-tier vCPU demand vs supply = svcNodes x 64 x oversub x (1 - k8sOverhead); RAM demand vs svcNodes x 512 x 0.9 x (1 - k8sOverhead); PASS or "ADD SERVICES NODES".
On-prem cost (INR Lakh, all environments): chassis = totalGpuNodes x template.priceL; cards = totalPhysicalGpus x cardL; services = totalSvcNodes x 14; storage = totalTB x applianceLperTB; ethernet = totalNodes x ethPerNodeL; fabric = if required, fabricBaseL x (1 + (drNodes>0?1:0)) + fabricPerNodeL x (prodNodes + drNodes). hw = chassis+cards+services+storage. install = hw x installPct. contingency = (hw + eth + fabric + install + implOneL) x contPct. capex = hw + eth + fabric + install + implOneL + contingency. Power L/yr = (gpuNodes x template.watts + physGpus x gpu.watts + svcNodes x 450) x 8760 x utilisation x tariff / 1e8. opex = power + hw x amcPct + manpowerL + facilitiesL + (nvaieLperGpu x physGpus + k8sLicLperNode x totalNodes). tco3 = capex + 3 x opex. tokensYrM = (prefillTot + decodeTot)/peakFactor x utilisation x 3600 x 8760 / 1e6. perMTok = tco3/3 x 1e5 / tokensYrM.

GOLDEN TEST (write as a unit test; the build is wrong until it passes)
Inputs: use cases [Compliance RAG assistant: RAG Q&A, 2000 total users, 4 req/hr; Document summarisation: Summarisation, 400 total users, 2 req/hr, input 30 Pages, output 1 Page; Agentic workflows: Reasoning-Agentic, 30 concurrent, 3 req/hr]; Llama 3.3 70B; H100 SXM5; FP8; targets 1000/50; corpus blank; retention 12; versions 2; Dev 25 UAT 35 DR 100; DR HA off; virtualisation on; all defaults.
Expected: peakRps 0.35; prefill 2512; decode 388; constraint "Memory"; chain 2 -> 3 -> 4 -> 5 -> prodGpus 6; TTFT 1281 (REVIEW); TPOT 22.9 (PASS); corpus estimate 65.9 GB; index RAM 237.3 GB; Prod storage 3.0 TB; Prod services nodes 7 (vector 2, platform 3, data 2); Prod vCPU supply 824.3; capex 967 L; 3-year TCO 1344 L.

Build the shell, all data files and the engine with the golden test, plus the Home page and the Workload page (use-case cards with live per-card token readouts and the three sample use cases pre-loaded).

This prompt creates the project. After it completes, rename the project to "Tantor Gen AI Sizer" if it was auto-named, then connect GitHub before continuing to Prompt 2.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/916e1ea0-37b2-4d6c-89f5-ed62498b78c0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
