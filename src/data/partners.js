// ─── Navon partner ecosystem ──────────────────────────────────────────────
// Single source of truth for the Partners overview (/partners) and the
// per-partner deep-dive pages (/partners/<slug>).
//
// Partners are mapped onto Navon's own stack so a customer can instantly see
// "who do I go to for what" — energy at the bottom, applications at the top,
// plus a cross-cutting capital & capability layer.
//
// ⚠️  BEFORE PUBLISHING:
//   • portrait: null  → a designed monogram tile renders. For real headshots,
//     drop the file in src/assets/partners/<slug>.jpg and render it through the
//     import.meta.glob + <Image> pattern (see CLAUDE.md "Dynamic images") so it
//     is optimized — do NOT point a raw <img> at a file in public/.
//   • founder.name: null → "Leadership team" renders with a confirm chip.
//   • quote → every quote below is a DRAFT placeholder. Replace each with a
//     real, partner-approved quote before this goes live.
//   • confirm: true → details are unverified (site fetch was blocked). Confirm
//     the copy with the partner before publishing.

export const layers = [
  { id: 'infrastructure', num: '01', name: 'Energy & Infrastructure',
    blurb: 'The power, cooling and physical backbone every sovereign site stands on.' },
  { id: 'compute', num: '02', name: 'Compute & Hardware',
    blurb: 'The silicon, servers and distributed capacity that do the work.' },
  { id: 'cloud', num: '03', name: 'Sovereign Cloud',
    blurb: 'The control plane that turns raw compute into a cloud you own.' },
  { id: 'security', num: '04', name: 'Cybersecurity',
    blurb: 'Quantum-grade trust, built into the stack rather than bolted on.' },
  { id: 'software', num: '05', name: 'Software, Apps & Agents',
    blurb: 'The platforms and autonomous operators customers actually touch.' },
  { id: 'capability', num: '06', name: 'Capital & Capability',
    blurb: 'Capital, risk and talent — what makes sovereign infrastructure investable and built to last.' },
];

export const partners = [
  // ── 01 · ENERGY & INFRASTRUCTURE ───────────────────────────────────────
  {
    slug: 'delta',
    name: 'Delta',
    legal: 'Delta Electronics',
    monogram: 'Δ',
    layer: 'infrastructure',
    tagline: 'Greening intelligence.',
    portrait: null,
    founder: { name: 'Bruce C.H. Cheng', role: 'Founder', linkedin: null },
    website: 'https://www.deltaww.com/en-US/index',
    oneLiner: 'The power electronics, thermal management and data-center infrastructure that keep a sovereign site running clean.',
    summary: 'Delta supplies the power and cooling backbone inside every Navon pod — switching power, thermal systems and energy-efficient infrastructure engineered for sustainable AI at scale.',
    quote: 'Sustainable compute can\u2019t be retrofitted — it has to be designed in from the first watt. Navon is building exactly that, and we\u2019re proud to power it.',
    quoteDraft: true,
    offers: [
      { title: 'Power Electronics', body: 'Industry-leading switching power supplies and conversion — the highest-efficiency path from grid to GPU.' },
      { title: 'Thermal Management', body: 'Liquid and air cooling engineered for dense AI racks, keeping PUE low at constant load.' },
      { title: 'Data-Center Infrastructure', body: 'Modular power, UPS and management systems that scale with each 400 kW pod.' },
      { title: 'Sustainable Energy', body: 'IoT-based smart energy systems that turn clean baseload into usable, measurable efficiency.' },
    ],
    stackFit: 'Delta sits at the foundation — Layer 01. Before a single accelerator switches on, Delta\u2019s power and thermal systems define how clean and how efficient the whole stack can be.',
  },

  // ── 02 · COMPUTE & HARDWARE ─────────────────────────────────────────────
  {
    slug: 'sytronix',
    name: 'Sytronix',
    legal: 'Sytronix',
    monogram: 'S',
    layer: 'compute',
    tagline: 'Built to break records. Designed to scale.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://www.sytronix.co.uk/',
    oneLiner: 'Record-breaking AI, HPC and rendering servers — elite-grade chassis manufactured in the UK.',
    summary: 'Sytronix builds the high-performance compute hardware that goes inside Navon pods: world-record servers and UK-manufactured data-center chassis with a modular architecture that scales without waste.',
    quote: 'Navon understands that sovereign compute starts with the metal. Putting our hardware inside their sites means performance and provenance, together.',
    quoteDraft: true,
    offers: [
      { title: 'AI & HPC Servers', body: 'Record-breaking compute nodes purpose-built for AI training, HPC and rendering workloads.' },
      { title: 'UK-Manufactured Chassis', body: 'Elite-grade, data-center-class chassis built with full infrastructure provenance.' },
      { title: 'Modular Architecture', body: 'Scale strategically — add capacity in increments, never paying for headroom you don\u2019t use.' },
      { title: 'Full-Stack Expertise', body: 'Hardware plus the integration know-how to deploy it inside a live sovereign site.' },
    ],
    stackFit: 'Sytronix is Layer 02 — the hardware that turns Delta\u2019s clean power into raw compute. Their chassis are the physical engine of every Navon pod.',
  },
  {
    slug: 'kinesis',
    name: 'Kinesis Network',
    legal: 'Kinesis Network',
    monogram: 'K',
    layer: 'compute',
    tagline: 'Code to live in minutes.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://kinesis.network/',
    oneLiner: 'An end-to-end deployment platform on a distributed GPU/CPU network with usage-based pricing that kills idle fees.',
    summary: 'Kinesis extends Navon\u2019s reach with distributed, high-performance compute — H100 GPUs and CPU fleets billed for what you actually use, so capacity flexes with demand instead of sitting idle.',
    quote: 'Sovereign infrastructure and elastic global capacity aren\u2019t a trade-off. With Navon, customers get both — and only pay for what they run.',
    quoteDraft: true,
    offers: [
      { title: 'NVIDIA H100 Fleets', body: 'Production-grade GPUs available on demand for training and inference.' },
      { title: 'True-Util\u2122 Pricing', body: 'Charged for actual resource consumption — no reserved-capacity tax, no idle fees.' },
      { title: 'Deploy Any Way', body: 'Docker, GitHub or AI-assisted builds — from prototype to global scale in minutes.' },
      { title: 'Inference & Batch', body: 'Optimised hosting for demanding AI/ML inference and batch processing.' },
    ],
    stackFit: 'Kinesis broadens Layer 02 — a distributed compute network that lets Navon burst beyond a single site while keeping the economics honest.',
  },
  {
    slug: 'qcentroid',
    name: 'QCentroid',
    legal: 'QCentroid',
    monogram: 'Q',
    layer: 'compute',
    tagline: 'QuantumOps for the enterprise.',
    portrait: null,
    founder: { name: 'Carlos Kuchkovsky', role: 'Founder & CEO', linkedin: null, confirm: true },
    website: 'https://qcentroid.xyz/',
    oneLiner: 'Adopt quantum computing without the complexity — one API across many quantum backends and algorithms.',
    summary: 'QCentroid brings quantum acceleration into Navon\u2019s compute layer. Their QuantumOps platform bridges quantum potential and real business impact through a single API to multiple hardware providers.',
    quote: 'Quantum only matters when it\u2019s usable. Navon gives our platform a sovereign home where enterprises can actually reach for it.',
    quoteDraft: true,
    offers: [
      { title: 'Unified Quantum API', body: 'One integration point to many quantum hardware backends — no per-vendor plumbing.' },
      { title: 'Multi-Hardware Access', body: 'Route workloads to the right quantum processor for the problem.' },
      { title: 'Algorithm Library', body: 'Production-ready quantum algorithms mapped to real enterprise use cases.' },
      { title: 'Enterprise QaaS', body: 'Quantum-computing-as-a-service with the integration and scaling handled for you.' },
    ],
    stackFit: 'QCentroid is the frontier edge of Layer 02 — quantum acceleration available alongside classical compute, ready when a workload calls for it.',
  },

  // ── 03 · SOVEREIGN CLOUD ────────────────────────────────────────────────
  {
    slug: 'hosted-ai',
    name: 'Hosted AI',
    legal: 'Hosted.ai',
    monogram: 'H',
    layer: 'cloud',
    tagline: 'The operating system for AI + GPU cloud.',
    portrait: null,
    founder: { name: 'Ditlev Bredahl', role: 'CEO', linkedin: null },
    website: 'https://hosted.ai/',
    oneLiner: 'The Neo Cloud control plane — turn raw GPUs into a software-defined, monetizable cloud business.',
    summary: 'Hosted AI is the operating system Navon runs on top of its GPUs. Intelligent orchestration and configurable overcommit (2\u201310x) eliminate underutilization, turning capacity into a profitable sovereign cloud.',
    quote: 'GPUs are wasted as hardware and powerful as software. Navon gets that — together we\u2019re turning sovereign capacity into a real cloud business.',
    quoteDraft: true,
    offers: [
      { title: 'GPU Orchestration', body: 'Software-defined scheduling that treats the whole fleet as one programmable resource.' },
      { title: 'Configurable Overcommit', body: '2\u201310x overcommit lifts utilization far past traditional GPU passthrough.' },
      { title: 'Multi-Tenant Control Panel', body: 'A single pane to deploy, manage and meter every tenant and workload.' },
      { title: 'Built to Monetize', body: 'The economics layer that turns capacity into recurring cloud revenue.' },
    ],
    stackFit: 'Hosted AI is Layer 03 — the control plane that turns Navon\u2019s metal into a sovereign cloud customers can self-serve.',
  },
  {
    slug: 'canopy-cloud',
    name: 'Canopy Cloud',
    legal: 'Canopy',
    monogram: 'C',
    layer: 'cloud',
    tagline: 'Procure cloud with confidence.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://www.canopycloud.io/',
    oneLiner: 'A vendor-agnostic cloud marketplace and FinOps layer — compare, negotiate and optimize across every provider.',
    summary: 'Canopy gives Navon customers an independent path to compare and procure cloud across all major providers, then keeps spend efficient with FinOps monitoring, benchmarking and forecasting.',
    quote: 'Sovereignty means choice. Canopy makes sure Navon\u2019s customers always get the right capacity at the right price — on their terms.',
    quoteDraft: true,
    offers: [
      { title: 'Cloud Marketplace', body: 'Vendor-agnostic access to every major and regional provider in one place.' },
      { title: 'AI Matchmaking', body: 'Match workloads to providers on performance, security and compliance.' },
      { title: 'FinOps Optimization', body: 'Monitor usage, surface inefficiencies and forecast spend continuously.' },
      { title: 'Negotiation', body: 'Cut procurement cycles from months to weeks and secure 15\u201325% better pricing.' },
    ],
    stackFit: 'Canopy complements Layer 03 — the procurement and cost-control layer that keeps sovereign cloud both flexible and economical.',
  },

  // ── 04 · CYBERSECURITY ──────────────────────────────────────────────────
  {
    slug: 'id-quantique',
    name: 'ID Quantique',
    legal: 'ID Quantique',
    monogram: 'IDQ',
    layer: 'security',
    tagline: 'Keeping data confidential, forever.',
    portrait: null,
    founder: { name: 'Gr\u00e9goire Ribordy', role: 'Co-founder & CEO', linkedin: null, confirm: true },
    website: 'https://www.idquantique.com/',
    oneLiner: 'Quantum-safe security — quantum key distribution and true randomness that protect data against tomorrow\u2019s computers.',
    summary: 'ID Quantique hardens Navon\u2019s security layer with quantum-grade trust: quantum key distribution and quantum random number generation that keep sovereign data confidential against future quantum attacks.',
    quote: 'The right to communicate securely is fundamental. Building quantum-safe trust into Navon\u2019s stack means that right holds for the long term.',
    quoteDraft: true,
    offers: [
      { title: 'Quantum Key Distribution', body: 'Physics-guaranteed key exchange that can\u2019t be intercepted undetected.' },
      { title: 'Quantum RNG', body: 'True randomness at the root of every key — no predictable seeds.' },
      { title: 'Quantum-Safe Networks', body: 'Crypto-agile architecture ready for the post-quantum era.' },
      { title: 'Photonic Detection', body: 'Single-photon sensing that underpins the quantum security stack.' },
    ],
    stackFit: 'ID Quantique is Layer 04 — quantum-safe trust woven through the stack so sovereignty survives the arrival of quantum computers.',
  },

  // ── 05 · SOFTWARE, APPS & AGENTS ────────────────────────────────────────
  {
    slug: 'tne',
    name: 'TNE.ai',
    legal: 'Total Neural Enterprises',
    monogram: 'T',
    layer: 'software',
    tagline: 'Private \u00b7 Sovereign \u00b7 In production in 90 days.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://tne.ai/',
    oneLiner: 'Private, sovereign enterprise AI in production in 90 days — the software, the agents and the infrastructure, on your terms.',
    summary: 'TNE.ai gives Navon customers the software utility layer to become AI-native on their own infrastructure: private AI systems, agents and automation with no vendor lock-in and up to 10x productivity gains.',
    quote: 'Becoming AI-native shouldn\u2019t mean handing your data to a hyperscaler. On Navon, our customers get sovereign AI in production — fast.',
    quoteDraft: true,
    offers: [
      { title: 'Private AI Platform', body: 'Build and run AI systems entirely on infrastructure you control.' },
      { title: 'AI Agents', body: 'Agentic automation across the Think \u2192 Navigate \u2192 Execute cycle.' },
      { title: '90-Day Deployment', body: 'Trained, automated and sovereign — in production in a quarter, not years.' },
      { title: 'No Lock-In', body: 'Your data and infrastructure stay yours, end to end.' },
    ],
    stackFit: 'TNE.ai is the software utility of Layer 05 — the platform that lets organisations turn Navon\u2019s stack into working, sovereign AI.',
  },
  {
    slug: 'evos',
    name: 'EvoS',
    legal: 'Evos',
    monogram: 'E',
    layer: 'software',
    tagline: 'The most experienced workforce in history.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://getevos.ai/',
    oneLiner: 'Autonomous AI operators that run routine operational work end-to-end — live in 24 hours.',
    summary: 'EvoS sits at the very top of the stack: configured AI operators that handle routine work across logistics, manufacturing, retail and finance, deployed on Navon compute in 24 hours with 150+ integrations.',
    quote: 'AI operators need a home they can trust. Running on Navon\u2019s sovereign stack means our customers get autonomy without giving up control.',
    quoteDraft: true,
    offers: [
      { title: 'Tailored AI Operators', body: 'Configured AI that handles routine operational work, end to end.' },
      { title: '24-Hour Deployment', body: 'From sign-off to live in a single day.' },
      { title: '150+ Integrations', body: 'Plugs into the systems your operations already run on.' },
      { title: 'Cross-Industry', body: 'Logistics, manufacturing, retail and private equity, out of the box.' },
    ],
    stackFit: 'EvoS is the apex of Layer 05 — the application customers experience directly, proving the whole stack with real autonomous work.',
  },
  // ── 06 · CAPITAL & CAPABILITY ───────────────────────────────────────────
  {
    slug: 'siscom',
    name: 'Siscom',
    legal: 'SISCOM',
    monogram: 'S',
    layer: 'capability',
    tagline: 'Africa\u2019s asset co-ownership hub.',
    portrait: null,
    founder: { name: 'Derrick Gakuu', role: 'Leadership', linkedin: null, confirm: true },
    website: 'https://siscom.africa/',
    oneLiner: 'Fractional, crowdfunded ownership of Africa\u2019s digital infrastructure — plus sector-specific solutions.',
    summary: 'Siscom opens local, crowdfunded financing so communities can co-own Navon-class infrastructure \u2014 data centers, compute and connectivity \u2014 with returns that stay on the continent.',
    quote: 'Infrastructure should be owned by the people it serves. With Navon, we let local investors hold a real stake in Africa\u2019s digital future.',
    quoteDraft: true,
    offers: [
      { title: 'Fractional Ownership', body: 'Own a slice of data centers, compute nodes and connectivity from a low entry point.' },
      { title: 'Local Crowdfunding', body: 'Community-funded capital that keeps returns and agency on the continent.' },
      { title: 'Sector Solutions', body: 'Sector-specific financing structures for technology and climate infrastructure.' },
      { title: 'Aligned Returns', body: 'Access to the growth of Africa\u2019s data-center market.' },
    ],
    stackFit: 'Siscom is Layer 06 — the capital layer. It answers how sovereign infrastructure gets financed locally rather than owned from abroad.',
  },
  {
    slug: 'azraq',
    name: 'Azraq',
    legal: 'Azraq',
    monogram: 'A',
    layer: 'capability',
    tagline: 'Turning complexity into confidence.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://azraq.ai/',
    oneLiner: 'Lender-grade AI risk intelligence for data-center portfolios — quantifying risk across the entire project lifecycle.',
    summary: 'Azraq turns fragmented data into institutional-grade risk intelligence for the people financing sovereign infrastructure. Monte Carlo modeling across six risk dimensions delivers quantified Value-at-Risk and risk-adjusted returns — built by a team out of Goldman Sachs, Bloomberg, Google, Arup and G42.',
    quote: 'Billion-dollar data-center decisions shouldn\u2019t run on fragmented data. With Navon, we\u2019re proving that lender-grade risk intelligence is how sovereign infrastructure gets built with confidence.',
    quoteDraft: true,
    offers: [
      { title: 'Six-Dimension Risk Engine', body: 'Market, environmental, infrastructure, social, regulatory and financial risk, modeled with Monte Carlo simulations.' },
      { title: 'Lender-Grade Analytics', body: 'Value at Risk (VaR 95%), risk-adjusted returns and site-specific impact assessments for credit committees.' },
      { title: 'Real-Time Monitoring', body: 'Live project and portfolio risk monitoring with covenant compliance tracking.' },
      { title: 'Compounding Data', body: 'Every project analyzed enriches a proprietary dataset — making the model smarter over time.' },
    ],
    stackFit: 'Azraq sits in Layer 06 — the capital layer. Before infrastructure gets financed it quantifies the risk, turning complex projects into investable, bankable opportunities.',
  },
  {
    slug: 'alliance-for-ai',
    name: 'Alliance for AI',
    legal: 'Alliance for AI',
    monogram: 'A',
    layer: 'capability',
    tagline: 'Amplifying diverse voices to advance responsible AI.',
    portrait: null,
    founder: { name: null, role: 'Leadership', linkedin: null },
    website: 'https://allianceforai.org/',
    oneLiner: 'Education, governance and advocacy that build responsible AI capability — and the people to run it.',
    summary: 'Alliance for AI is Navon\u2019s education and responsible-AI partner: training, governance frameworks and advocacy that turn a sovereign stack into real, local capability — with an emphasis on inclusive, ethical AI that benefits every community.',
    quote: 'Sovereign compute without sovereign talent is half a strategy. Together with Navon, we\u2019re building both — responsibly.',
    quoteDraft: true,
    offers: [
      { title: 'Education & Training', body: 'Practical programs on building and operating responsible AI.' },
      { title: 'Governance Frameworks', body: 'Strategic AI governance roadmaps and ethical guardrails.' },
      { title: 'Sector Guidance', body: 'Tailored guidance across healthcare, education, media and justice.' },
      { title: 'Advocacy & Community', body: 'Amplifying diverse voices and partnerships across the ecosystem.' },
    ],
    stackFit: 'Alliance for AI is the human side of Layer 06 — the capability layer. Compute is only sovereign when local people can build on it.',
  },
];

export const partnersByLayer = layers.map((layer) => ({
  ...layer,
  partners: partners.filter((p) => p.layer === layer.id),
}));

export function getAdjacent(slug) {
  const i = partners.findIndex((p) => p.slug === slug);
  return {
    prev: i > 0 ? partners[i - 1] : partners[partners.length - 1],
    next: i < partners.length - 1 ? partners[i + 1] : partners[0],
  };
}
