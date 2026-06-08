// ─── Navon news ────────────────────────────────────────────────────────────
// Single source of truth for the News list (/news) and the per-article
// detail pages (/news/<slug>).
//
// Each item is newest-first. How an item links from the list:
//   • `body` present  → renders a full on-site article at /news/<slug>.html;
//     the list item links there (same tab).
//   • `external` only → list item links out to the source (opens new tab).
//   • neither         → static, non-clickable (no source yet).
//
// Article fields (only needed when `body` is present):
//   headline   fuller H1 for the article page (falls back to `title`)
//   standfirst one-line lede shown under the headline
//   body       array of paragraph strings
//   quotes     array of { quote, name, role }
//   contact    media-contact email shown in the article footer

export const news = [
  {
    slug: 'dif-sovereign-green-data-centre',
    my: 'JUN 2026', day: '08', dow: 'MON',
    tag: 'Milestone',
    title: "Navon selected by the Digital Investment Facility to build Kenya's first sovereign, green data centre.",
    desc: "Navon will receive tailored technical assistance from the Digital Investment Facility (DIF) — backed by the European Commission, Germany and Finland under the Team Europe D4D Hub — to build a 0.8MW sovereign and green data centre in Hells Gate Deep Tech Park, serving Kenyan businesses, research institutions, and the health, finance and agriculture sectors.",
    external: 'https://www.linkedin.com/posts/d4dhub_hell-dif-dif-activity-7469644615499800576-Bod1',
  },
  {
    slug: 'sytronix-hardware-partnership',
    my: 'OCT 2025', day: '20', dow: 'MON',
    tag: 'Partnership',
    title: 'Navon and Sytronix sign strategic hardware partnership.',
    desc: 'A partnership focused on delivering improved value for modular co-location customers through right-fit compute systems — closing the gap between the rack and the workload.',
    headline: 'Navon World and Sytronix sign strategic hardware partnership to advance right-fit compute systems for co-location services.',
    standfirst: 'Navon World and Sytronix have entered a new hardware partnership focused on delivering better value for modular co-location customers through right-fit compute systems.',
    body: [
      "Navon World and Sytronix have signed a strategic hardware partnership to improve the performance and flexibility of Navon's Right-fit Hardware Systems for co-location clients. The partnership brings Sytronix's high-performance servers and storage systems into Navon's modular data center deployments, making it easier to match hardware to each client's needs.",
      "The agreement includes joint hardware testing, performance tuning, and deployment planning across modular and co-location environments. Sytronix, based in Lancashire, manufactures some of the world's fastest compute servers and holds records across leading rendering and AI software platforms. Its modular server architecture allows clients to scale performance as workloads grow. The company also designs advanced, efficient, and durable data center chassis, and supports full data center builds for IT providers and enterprise clients. As a premium UK manufacturer, Sytronix brings strong engineering capability and reliable customer support to the partnership.",
    ],
    quotes: [
      {
        quote: 'Partnering with Navon World gives us the opportunity to bring our high-performance, right-fit hardware systems into modular, scalable deployments that deliver real value for clients, whether in compute, rendering or AI workloads.',
        name: 'Jason Poole',
        role: 'Operations Director, Sytronix',
      },
      {
        quote: "We're not selling generic rack space. We build bespoke modular environments matched to what each client actually needs — right-fit hardware that scales with their workloads. Sytronix gives us the engineering to deliver that. Better economics from energy to compute to value.",
        name: 'Karan Pinto',
        role: 'Navon',
      },
    ],
    contact: 'press@navonworld.com',
  },
  {
    slug: 'africa-compute-fund-agreement',
    my: 'OCT 2025', day: '14', dow: 'TUE',
    tag: 'Strategic agreement',
    title: 'Navon and Africa Compute Fund sign strategic agreement.',
    desc: 'Joint deployment of sovereign AI infrastructure beginning with the Nairobi Supercluster, with structured opportunities for additional compute participants to join.',
    headline: 'Navon World and Africa Compute Fund sign strategic agreement to expand sovereign AI infrastructure across Africa.',
    standfirst: 'Nairobi — Navon World and Africa Compute Fund (ACF) have entered into an agreement to jointly deploy sovereign AI infrastructure, beginning with support for the Nairobi Supercluster and opening opportunities for additional compute offtakers to join.',
    body: [
      "Navon World and Africa Compute Fund (ACF) today announce a strategic partnership to accelerate deployment of sovereign, modular AI infrastructure across Africa, anchored by support for ACF's Nairobi Supercluster. The Nairobi Supercluster, Africa's first high performance NVIDIA H100 GPU cluster, serves as an initial node in a continent-wide compute network.",
      "Under the agreement, ACF will act as the anchor capacity allocator through its Monarch platform, enabling tenants to schedule jobs, allocate GPU resources, and receive metering, logging, and billing via a unified interface. Navon will provide prefabricated, modular compute pods optimized for energy efficiency, fast deployment, and scalable expansion. Together, they aim to build an ecosystem that supports multiple compute offtakers, from universities and startups to enterprises and governments, seeking sovereign, clean, and regionally proximate infrastructure.",
      "ACF and Navon invite additional compute users, energy project developers, and academic and public sector institutions to engage in this framework, whether via reserved compute allocations, energy pairing collaborations, or co-ownership models. As more nodes come online, the network aims to provide interoperable sovereign compute capacity across Africa, lowering barriers for those previously excluded from frontier AI infrastructure.",
    ],
    quotes: [
      {
        quote: "Our mission is sovereignty, energy, and talent. This partnership brings that to life. By aligning with ACF's deployment roadmap, we help strengthen Africa's ability to own its compute, deploy locally, and build local expertise.",
        name: 'Romi Sumaria',
        role: 'CEO, Navon World',
      },
    ],
    contact: 'press@navon.world',
  },
  {
    slug: 'alliance4ai-mou',
    my: 'AUG 2025', day: '08', dow: 'FRI',
    tag: 'MOU',
    title: 'Navon and Alliance4AI sign MOU to advance responsible AI and quantum tech in Africa.',
    desc: 'An agreement to accelerate responsible AI and quantum technology innovation across the African continent — pairing Navon infrastructure with Alliance4AI policy and ecosystem reach.',
    headline: 'Navon World and Alliance4AI sign MOU to advance responsible AI and quantum tech in Africa.',
    standfirst: 'Navon World and Alliance4AI have signed a Memorandum of Understanding to accelerate responsible AI and Quantum Tech innovation across Africa.',
    body: [
      'Navon World and Alliance4AI have entered into a Memorandum of Understanding to collaborate on advancing responsible Artificial Intelligence and Quantum Technology education and innovation across Africa.',
      "The partnership will pool expertise, networks, and resources to support the continent's emerging tech ecosystem. It includes establishing Quantum-AI clubs at universities, launching continent-wide hackathons focused on health, energy, and climate, and co-developing specialized curricula and certifications. The two organizations will also co-author grant proposals and leverage Navon's modular data center infrastructure to host projects, provide hands-on computing resources via UduTech's Africa GPU Hub, and create internship and mentorship opportunities for young African talent.",
    ],
    quotes: [
      {
        quote: 'This partnership marks an exciting step in democratizing AI and Quantum education across the continent. By combining community networks with Navon\u2019s infrastructure and industry leadership, we can help African students and researchers tackle global challenges with homegrown innovation.',
        name: 'Alexander Tsado',
        role: 'Executive Director, Alliance4AI',
      },
      {
        quote: "The collaboration with Alliance4AI reflects Navon World's commitment to scaling equitable access to transformative technologies. Together, we aim to empower Africa's next generation of innovators with the tools and skills to shape an inclusive tech future.",
        name: 'Karan Pinto',
        role: 'Co-founder, Navon World',
      },
    ],
  },
  {
    slug: 'siscom-technology-mou',
    my: 'JUL 2025', day: '21', dow: 'MON',
    tag: 'MOU',
    title: 'Navon and Siscom Technology sign MOU.',
    desc: 'An agreement to jointly build AI infrastructure and expand modular data centre investment access to broader public audiences across the region.',
    headline: 'Navon World and Siscom Technology sign MOU to advance public access to modular data center investing.',
    standfirst: 'Nairobi — Navon World and Siscom Technology have signed a Memorandum of Understanding to jointly build AI infrastructure and expand modular data center investment access to the broader public.',
    body: [
      'Navon World and Siscom Technology have signed a Memorandum of Understanding (MoU) to pursue a strategic collaboration focused on democratizing investment access to modular data centers and advancing regional AI infrastructure.',
      'The agreement outlines plans for joint AI infrastructure development, collaborative software engineering, and shared R&D in machine learning and analytics. The two companies will also co-deploy products and engage strategic investors to scale impact. A key goal is enabling broader public participation in modular data center ownership through innovative commercial models.',
    ],
    quotes: [
      {
        quote: 'Making data infrastructure more accessible and investable is critical to closing the digital divide. This partnership helps us move faster.',
        name: 'Romi Sumaria',
        role: 'CEO, Navon World',
      },
      {
        quote: 'This is the start of a long-term collaboration to empower more communities and investors with AI-driven infrastructure opportunities.',
        name: 'Derrick Gakuu',
        role: 'Head of Innovation, Siscom Technologies',
      },
    ],
    contact: 'press@navonworld.com',
  },
  {
    slug: 'strathmore-university-mou',
    my: 'JUL 2025', day: '18', dow: 'FRI',
    tag: 'University partnership',
    title: 'Strathmore University and Navon sign MOU.',
    desc: 'A partnership to collaborate on digital infrastructure, education, and innovation — supporting students and researchers in Kenya with sovereign compute and on-site placements.',
    headline: 'Strathmore University and Navon World sign MOU to advance frontier technologies in education and infrastructure.',
    standfirst: 'Nairobi, Kenya — Strathmore University and Navon World have signed a Memorandum of Understanding to collaborate on digital infrastructure, education, and innovation programs to support students and researchers in Kenya and beyond.',
    body: [
      'Under the agreement, Navon and Strathmore University will explore opportunities to expand access to compute and AI infrastructure to support research and innovation, with potential applications in the Naivasha Special Economic Zone. The partnership also envisions the joint development of executive education programs in areas such as AI, Quantum Computing, and Cybersecurity. Support for student-led startups may include access to infrastructure and mentorship designed to accelerate innovation. The collaboration will further assess the deployment of on-campus edge infrastructure, including modular data center solutions. Both institutions will also seek to co-develop thought leadership around AI ethics and digital strategy, while engaging with the Quantum and Nuclear (QaN) Hub to strengthen technical and academic collaboration.',
    ],
    quotes: [
      {
        quote: "This partnership aligns with our mission to drive world-class research and innovation. Navon's infrastructure and expertise will help our students build in areas that matter.",
        name: 'Eng. Dr. Julius Butime',
        role: 'Director of Partnerships, Strathmore University',
      },
      {
        quote: "It was great to be on campus and see firsthand the ambition of the leadership and the depth of academic talent at Strathmore. What's clear is that unlocking entrepreneurial potential and driving frontier innovation from Africa will depend on making deep technologies more accessible, through global industry knowhow and affordable compute infrastructure.",
        name: 'Karan Pinto',
        role: 'Co-Founder and CTO, Navon World',
      },
    ],
    contact: ['info@navon.world', 'partnerships@strathmore.edu'],
  },
  {
    slug: 'navon-at-blue-beach',
    my: 'JUN 2025', day: '25', dow: 'WED',
    tag: 'Speaking',
    title: 'Navon at Blue Beach: rethinking data centre infrastructure.',
    desc: 'Navon advocates for European policymakers to prioritise renewable power sources over legacy fibre corridors when planning the next generation of digital sovereignty.',
    headline: 'Navon World at Blue Beach: rethinking data center infrastructure in a sovereign digital age.',
    standfirst: 'Navon World calls on European policymakers to rethink data center siting, placing renewable power sources ahead of legacy fiber corridors to secure digital sovereignty, cut energy loss, and ease hyperscaler dependence.',
    body: [
      'Navon World today unveiled a power-first vision for European data centers at the Blue Beach conference in Hamburg, arguing that national security now hinges on where and how compute is powered.',
      "Speaker Erin Beilharz contrasted Europe's crowded FLAP-D hubs with a U.S. trend of building data centers next to generation assets, showing how colocating with wind, solar, hydro, or nuclear sites slashes transmission losses, stabilizes energy pricing, and unlocks new regions for growth. She urged governments to audit unused industrial land near renewables, pair it with robust fiber or satellite backhaul, and even consider energy-rich partners such as Morocco, Algeria, or Kenya — provided their data laws align with GDPR. The goal: create privacy-aligned, sovereign compute zones that reduce over-reliance on hyperscalers subject to the U.S. Cloud Act.",
      'Navon World is exploring joint ventures and research pilots to validate power-first deployments and non-aligned cloud models across Europe and select global-south markets, with results to be shared later this year.',
    ],
    quotes: [
      {
        quote: "Europe can no longer treat data centers as passive tenants of the grid. By anchoring them to clean power first, we turn compute into a strategic asset that delivers resilience, lowers emissions, and keeps our citizens' data in jurisdictions we control.",
        name: 'Erin Beilharz',
        role: 'Head of Infrastructure Strategy, Navon World',
      },
    ],
    contact: 'press@navonworld.com',
  },
];
