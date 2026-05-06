const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SITE_NAME = "SurfaceLine Systems";
const SITE_URL = "https://www.example.com";

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`wrote ${path.relative(ROOT, filePath)}`);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#039;");
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    return `<a href="${escapeAttr(href)}">${label}</a>`;
  });
  return html;
}

function parseFrontmatter(markdown) {
  if (!markdown.startsWith("---")) return [{}, markdown];
  const end = markdown.indexOf("\n---", 3);
  if (end === -1) return [{}, markdown];
  const raw = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 4).trim();
  const data = {};
  raw.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^([a-zA-Z0-9_]+):\s*"?([^"]*)"?\s*$/);
    if (match) data[match[1]] = match[2];
  });
  return [data, body];
}

function stripBuiltInToc(markdown) {
  return markdown.replace(/\n## Table of Contents[\s\S]*?(?=\n## )/, "\n");
}

function headingToc(markdown) {
  return [...markdown.matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1].trim())
    .filter((title) => title !== "Table of Contents")
    .map((title) => ({ title, id: slugify(title) }));
}

function isTableStart(lines, index) {
  const current = lines[index] && lines[index].trim();
  const next = lines[index + 1] && lines[index + 1].trim();
  return Boolean(
    current &&
      next &&
      current.includes("|") &&
      next.includes("|") &&
      /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(next)
  );
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(rows) {
  const header = splitTableRow(rows[0]);
  const body = rows.slice(2).map(splitTableRow);
  const headHtml = header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("");
  const bodyHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`)
    .join("\n");
  return `<div class="table-scroll"><table><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
}

function renderDiagram(index) {
  if (index === 0) {
    const steps = [
      ["Incoming", "part lots, drawings, traceability"],
      ["Load + ID", "manual, hoist, robot or conveyor"],
      ["Pre-treat", "degrease, chip removal, masking"],
      ["Finish", "blast, vibratory, tumble or robot"],
      ["Separate", "screen, magnetic recovery, blow-off"],
      ["Clean", "wash, rinse, chemistry control"],
      ["Dry", "air knives, tunnel or centrifugal"],
      ["Inspect", "Ra/Rz, cleanliness, visual checks"],
    ];
    return `<div class="diagram-shell"><div class="diagram-title">System Diagram: Typical Process Flow</div><div class="flow-strip">${steps
      .map(([title, sub]) => `<div class="flow-node">${title}<small>${sub}</small></div>`)
      .join("")}</div></div>`;
  }

  if (index === 1) {
    return `<div class="diagram-shell"><div class="diagram-title">System Diagram: Automation and Control Architecture</div><div class="automation-map">
      <div class="automation-row top">
        <div class="auto-node primary">ERP / MES<small>orders, routing, lot records</small></div>
        <div class="auto-node primary">Quality Database<small>surface checks, inspection history</small></div>
      </div>
      <div class="automation-row top">
        <div class="auto-node control">SCADA / Line PC<small>dashboards, OEE, reports</small></div>
        <div class="auto-node control">Main PLC + Safety PLC<small>sequence control, recipes, interlocks</small></div>
      </div>
      <div class="automation-row">
        <div class="auto-node">Blasting<small>wheel current, media flow</small></div>
        <div class="auto-node">Washing<small>pressure, pH, temperature</small></div>
        <div class="auto-node">Drying<small>airflow, dwell time</small></div>
        <div class="auto-node">Inspection<small>vision, roughness, rejects</small></div>
      </div>
    </div></div>`;
  }

  return `<div class="diagram-shell"><div class="diagram-title">System Diagram: Configuration Selection</div><div class="config-map">
    <div class="config-node">Batch Systems<small>high mix, moderate volume, flexible recipes</small></div>
    <div class="config-node">Continuous Lines<small>stable part families, high throughput, takt-time flow</small></div>
    <div class="config-node">Robotic Cells<small>complex geometry, controlled coverage, traceable motion</small></div>
  </div></div>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const out = [];
  let i = 0;
  let diagramIndex = 0;
  let skippedH1 = false;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const info = trimmed.replace(/^```/, "").trim();
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      if (info === "mermaid") {
        out.push(renderDiagram(diagramIndex));
        diagramIndex += 1;
      } else {
        out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      }
      continue;
    }

    if (isTableStart(lines, i)) {
      const rows = [];
      while (i < lines.length && lines[i].trim().includes("|")) {
        rows.push(lines[i]);
        i += 1;
      }
      out.push(renderTable(rows));
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2].trim();
      if (level === 1 && !skippedH1) {
        skippedH1 = true;
        i += 1;
        continue;
      }
      const id = level <= 3 ? ` id="${slugify(text)}"` : "";
      out.push(`<h${level}${id}>${inlineMarkdown(text)}</h${level}>`);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      out.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith("```") &&
      !/^(#{1,6})\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !isTableStart(lines, i)
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    out.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
  }

  return out.join("\n");
}

function leadForm(compact = false) {
  return `<form class="lead-form" data-lead-form>
    <h3>Request a line study</h3>
    <p>Send the core application data and we will size the process route, equipment scope and ROI model.</p>
    <div class="field"><label for="${compact ? "side-name" : "lead-name"}">Name</label><input id="${compact ? "side-name" : "lead-name"}" name="name" autocomplete="name" required></div>
    <div class="field"><label for="${compact ? "side-email" : "lead-email"}">Work email</label><input id="${compact ? "side-email" : "lead-email"}" type="email" name="email" autocomplete="email" required></div>
    <div class="field"><label for="${compact ? "side-volume" : "lead-volume"}">Production volume</label><input id="${compact ? "side-volume" : "lead-volume"}" name="volume" placeholder="parts/hour, shift or year"></div>
    <div class="field"><label for="${compact ? "side-process" : "lead-process"}">Application</label><textarea id="${compact ? "side-process" : "lead-process"}" name="application" placeholder="Material, part size, current defects, required surface finish"></textarea></div>
    <button class="button" type="submit">Request concept study</button>
    <div class="form-note" role="status" aria-live="polite"></div>
  </form>`;
}

function nav(active = "") {
  const is = (key) => (active === key ? " active" : "");
  return `<header class="site-header">
    <a class="brand" href="/"><span class="brand-mark">SF</span><span>${SITE_NAME}</span></a>
    <button class="nav-toggle" aria-controls="site-nav" aria-expanded="false" aria-label="Open navigation">☰</button>
    <nav class="site-nav" id="site-nav">
      <a class="${is("home")}" href="/">Home</a>
      <a class="${is("surface")}" href="/surface-finishing-lines/">Surface finishing lines</a>
      <a href="/surface-finishing-lines/#key-equipment-in-finishing-lines">Equipment</a>
      <a href="/surface-finishing-lines/#roi-and-cost-analysis">ROI</a>
      <a href="/#resources">Resources</a>
      <a class="nav-cta" href="#contact">Request quote</a>
    </nav>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="footer-inner">
      <div>
        <a class="brand" href="/"><span class="brand-mark">SF</span><span>${SITE_NAME}</span></a>
        <p>Engineering-led surface finishing systems for production lines that need measurable throughput, roughness, cleanliness and cost-per-part control.</p>
      </div>
      <div>
        <div class="footer-title">Systems</div>
        <div class="footer-links">
          <a href="/surface-finishing-lines/">Surface finishing lines</a>
          <a href="/shot-blasting-machines/">Shot blasting machines</a>
          <a href="/vibratory-finishing-equipment/">Vibratory finishing equipment</a>
          <a href="/blasting-cabinet-systems/">Blasting cabinet systems</a>
        </div>
      </div>
      <div>
        <div class="footer-title">Engineering Guides</div>
        <div class="footer-links">
          <a href="/tumbling-machine-guide/">Tumbling machine guide</a>
          <a href="/surface-roughness-measurement/">Surface roughness measurement</a>
          <a href="/abrasive-quality-control/">Abrasive quality control</a>
        </div>
      </div>
    </div>
    <div class="legal">© 2026 ${SITE_NAME}. Static website prototype for surface finishing line lead generation.</div>
  </footer>`;
}

function layout({ title, description, active, body, canonical, schema }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="canonical" href="${SITE_URL}${canonical}">
  <link rel="stylesheet" href="/assets/styles.css">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${SITE_URL}/assets/surface-line-visual.png">
  <script type="application/ld+json">${JSON.stringify(schema || basicSchema(title, description, canonical))}</script>
</head>
<body>
  ${nav(active)}
  <main>${body}</main>
  ${footer()}
  <script src="/assets/app.js"></script>
</body>
</html>`;
}

function basicSchema(title, description, canonical) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: title,
    description,
    url: `${SITE_URL}${canonical}`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
    },
  };
}

function homePage() {
  const resources = resourcePages
    .map(
      (page) => `<article class="resource-card">
        <h3>${page.title}</h3>
        <p>${page.description}</p>
        <a class="card-link" href="/${page.slug}/">Open guide</a>
      </article>`
    )
    .join("");

  const body = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Surface engineering / industrial automation</p>
        <h1>Surface Finishing Lines</h1>
        <p>Complete automated systems for blasting, vibratory finishing, washing, drying, inspection and production data capture. Built for manufacturers who need measurable surface quality, stable throughput and a defensible cost per part.</p>
        <div class="hero-actions">
          <a class="button" href="/surface-finishing-lines/">Read the complete guide</a>
          <a class="button-secondary" href="#contact">Request a concept study</a>
        </div>
        <div class="metric-row">
          <div class="metric"><strong>Ra/Rz</strong><span>surface profile targets and inspection plans</span></div>
          <div class="metric"><strong>OEE</strong><span>availability, performance and quality monitoring</span></div>
          <div class="metric"><strong>ROI</strong><span>labor, rework, media and energy cost models</span></div>
        </div>
      </div>
      <div class="hero-media">
        <img src="/assets/surface-line-visual.png" alt="Automated surface finishing line with blasting, washing, drying and inspection stations">
        <div class="media-label">Integrated line concept: pretreatment, finishing, separation, wash, dry, inspection and PLC feedback.</div>
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <h2>Production systems, not isolated machines</h2>
        <p>A finishing line succeeds when process stations, transfer points, consumables, sensors and inspection criteria are engineered around the same production target.</p>
      </div>
      <div class="systems-grid" id="equipment">
        <article class="system-card"><h3>Blasting and profiling</h3><p>Wheel blast, air blast and cabinet systems for scale removal, coating profile and foundry cleaning.</p><a class="card-link" href="/shot-blasting-machines/">View blasting systems</a></article>
        <article class="system-card"><h3>Mass finishing</h3><p>Vibratory and tumbling processes for edge break, burr removal, smoothing and controlled surface texture.</p><a class="card-link" href="/vibratory-finishing-equipment/">View mass finishing</a></article>
        <article class="system-card"><h3>Cleaning and drying</h3><p>Washers, rinses, air knives, dryers and corrosion protection sized around part geometry and carryover.</p><a class="card-link" href="/surface-finishing-lines/#typical-process-flow">View process flow</a></article>
        <article class="system-card"><h3>Conveyors and robotics</h3><p>Batch, continuous and robotic layouts for stable takt time, ergonomics and repeatable coverage.</p><a class="card-link" href="/surface-finishing-lines/#line-configurations">Compare configurations</a></article>
        <article class="system-card"><h3>Automation controls</h3><p>PLC recipes, HMI screens, alarms, sensors, OEE and process monitoring for production evidence.</p><a class="card-link" href="/surface-finishing-lines/#automation-and-control">Review controls</a></article>
        <article class="system-card"><h3>Inspection and ROI</h3><p>Roughness measurement, abrasive quality control, first-pass yield and cost-per-part models.</p><a class="card-link" href="/surface-finishing-lines/#performance-metrics">See metrics</a></article>
      </div>
    </section>

    <section class="band">
      <div class="process-panel">
        <div>
          <p class="eyebrow">Process engineering</p>
          <h2>Line concepts built around geometry, volume and surface specification</h2>
          <p>We evaluate contamination, burr condition, part handling, media behavior, cleaning burden, drying risk and inspection criteria before selecting equipment. That makes the commercial proposal stronger because the scope matches the manufacturing problem.</p>
          <div class="signal-list">
            <span>Part drawings + samples</span>
            <span>Throughput model</span>
            <span>Utilities and layout</span>
            <span>Acceptance criteria</span>
          </div>
        </div>
        <img src="/assets/process-control-visual.png" alt="Automation control architecture for a surface finishing line">
      </div>
    </section>

    <section class="section">
      <div class="section-heading">
        <h2>Commercial outcomes buyers care about</h2>
        <p>The line should improve more than appearance. The proposal should show how the system affects labor, rework, consumables, uptime and downstream yield.</p>
      </div>
      <div class="roi-strip">
        <div><strong>Throughput</strong><span>Good parts per hour, not theoretical machine loading.</span></div>
        <div><strong>Quality</strong><span>Surface roughness, cleanliness, burr condition and first-pass yield.</span></div>
        <div><strong>Cost</strong><span>Labor, media, water, energy, filters, maintenance and waste handling.</span></div>
        <div><strong>Payback</strong><span>Annual net savings compared with total installed project cost.</span></div>
      </div>
    </section>

    <section class="section" id="resources">
      <div class="section-heading">
        <h2>Technical resource pages</h2>
        <p>Use these pages as internal buying guides for equipment selection, process validation and quality control.</p>
      </div>
      <div class="resource-grid">${resources}</div>
    </section>

    <section class="cta-band" id="contact">
      <div class="cta-inner">
        <div>
          <p class="eyebrow">RFQ support</p>
          <h2>Start with part data. Leave with a line concept.</h2>
          <p>Share part drawings, photos, current surface condition, annual volume, target throughput and surface requirements. The first engineering response should define the process route, equipment scope, controls concept and budgetary ROI assumptions.</p>
        </div>
        ${leadForm(false)}
      </div>
    </section>`;

  return layout({
    title: "Surface Finishing Lines | Automated Industrial Finishing Systems",
    description:
      "SurfaceLine Systems designs automated surface finishing lines for blasting, vibratory finishing, washing, drying, inspection and ROI-driven production integration.",
    active: "home",
    canonical: "/",
    body,
  });
}

function articlePage() {
  const source = fs.readFileSync(path.join(ROOT, "surface-finishing-lines", "index.md"), "utf8");
  const [frontmatter, rawBody] = parseFrontmatter(source);
  const cleaned = stripBuiltInToc(rawBody);
  const title =
    frontmatter.meta_title ||
    frontmatter.title ||
    "Surface Finishing Lines: Complete Guide to Automated Systems, Equipment Integration and Process Design";
  const description =
    frontmatter.meta_description ||
    "A technical and commercial guide to automated surface finishing lines, equipment integration, controls, performance metrics and ROI.";
  const toc = headingToc(cleaned);
  const articleHtml = markdownToHtml(cleaned);
  const tocHtml = toc.map((item) => `<a href="#${item.id}">${item.title}</a>`).join("");

  const body = `
    <section class="hero article-hero">
      <div class="hero-copy">
        <p class="eyebrow">Complete technical pillar page</p>
        <h1>Surface Finishing Lines</h1>
        <p>Automated systems, equipment integration and process design for manufacturers that need reliable surface preparation, deburring, cleaning, drying, inspection and cost-per-part control.</p>
        <div class="hero-actions">
          <a class="button" href="#contact">Request line concept</a>
          <a class="button-secondary" href="#typical-process-flow">Review process flow</a>
        </div>
        <div class="metric-row">
          <div class="metric"><strong>11k+</strong><span>word commercial engineering guide</span></div>
          <div class="metric"><strong>3</strong><span>system diagrams embedded in the article</span></div>
          <div class="metric"><strong>ROI</strong><span>investment, labor and payback modeling</span></div>
        </div>
      </div>
      <div class="hero-media">
        <img src="/assets/surface-line-visual.png" alt="Complete automated surface finishing line diagram">
        <div class="media-label">Designed around real part flow: loading, finishing, cleaning, drying, inspection and control feedback.</div>
      </div>
    </section>

    <section class="article-shell">
      <aside class="toc"><strong>Guide sections</strong>${tocHtml}</aside>
      <article class="content">${articleHtml}</article>
      <aside class="lead-aside">${leadForm(true)}</aside>
    </section>

    <section class="cta-band" id="contact">
      <div class="cta-inner">
        <div>
          <p class="eyebrow">Custom line design</p>
          <h2>Send the part family and production target.</h2>
          <p>We will map the process route, identify equipment scope, define acceptance criteria and outline the commercial model for a complete surface finishing line.</p>
        </div>
        ${leadForm(false)}
      </div>
    </section>`;

  return layout({
    title,
    description,
    active: "surface",
    canonical: "/surface-finishing-lines/",
    body,
    schema: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: frontmatter.title,
      description,
      image: `${SITE_URL}/assets/surface-line-visual.png`,
      mainEntityOfPage: `${SITE_URL}/surface-finishing-lines/`,
      publisher: {
        "@type": "Organization",
        name: SITE_NAME,
      },
    },
  });
}

const resourcePages = [
  {
    slug: "shot-blasting-machines",
    title: "Shot Blasting Machines",
    description: "Wheel blast and air blast systems for descaling, cleaning, foundry finishing and coating profile control.",
    fit: ["Roller conveyor blast lines", "Tumble blast machines", "Spinner hanger machines", "Robotic air blast cells"],
    specs: ["Abrasive type and size", "Wheel power and media flow", "Coverage requirement", "Dust collector sizing", "Wear liner access"],
  },
  {
    slug: "vibratory-finishing-equipment",
    title: "Vibratory Finishing Equipment",
    description: "Batch and continuous vibratory systems for deburring, edge rounding, smoothing, polishing and washing support.",
    fit: ["Machined parts", "Stamped components", "Die-cast housings", "Medical and precision parts"],
    specs: ["Media shape and size", "Compound chemistry", "Batch load", "Cycle time", "Media separation method"],
  },
  {
    slug: "tumbling-machine-guide",
    title: "Tumbling Machine Guide",
    description: "Barrel, centrifugal barrel and centrifugal disc tumbling processes for robust batch finishing applications.",
    fit: ["Hardware", "Stampings", "Fasteners", "Small castings and forgings"],
    specs: ["Fill ratio", "Part-on-part contact risk", "Media mix", "Cycle time", "Unload and separation ergonomics"],
  },
  {
    slug: "blasting-cabinet-systems",
    title: "Blasting Cabinet Systems",
    description: "Manual, semi-automatic and robotic blast cabinet systems for precision surface preparation and localized finishing.",
    fit: ["Aerospace brackets", "Repair operations", "Tooling", "Low-volume precision parts"],
    specs: ["Nozzle pressure", "Standoff distance", "Fixture access", "Media recovery", "Operator visibility and dust control"],
  },
  {
    slug: "surface-roughness-measurement",
    title: "Surface Roughness Measurement",
    description: "Practical guidance for Ra, Rz, sampling locations, profilometer setup and finishing line acceptance criteria.",
    fit: ["Coating preparation", "Sealing surfaces", "Functional friction surfaces", "Cosmetic finish validation"],
    specs: ["Ra and Rz target range", "Cutoff settings", "Measurement direction", "Sampling frequency", "Rework rules"],
  },
  {
    slug: "abrasive-quality-control",
    title: "Abrasive Quality Control",
    description: "Media operating mix, separator performance, contamination control and abrasive cost management for blast lines.",
    fit: ["Foundry blast lines", "Coating prep systems", "High-volume wheel blast", "Critical profile control"],
    specs: ["Operating mix", "Fines removal", "Media hardness", "Separator adjustment", "Consumption per hour"],
  },
];

function resourcePage(page) {
  const related = resourcePages
    .filter((item) => item.slug !== page.slug)
    .slice(0, 3)
    .map((item) => `<a href="/${item.slug}/">${item.title}</a>`)
    .join("");

  const body = `
    <section class="hero resource-hero">
      <div class="hero-copy">
        <p class="eyebrow">Technical buying guide</p>
        <h1>${page.title}</h1>
        <p>${page.description} Use this page as a focused resource when defining the equipment scope for a complete surface finishing line.</p>
        <div class="hero-actions">
          <a class="button" href="/surface-finishing-lines/">Back to line guide</a>
          <a class="button-secondary" href="#contact">Request equipment scope</a>
        </div>
      </div>
      <div class="hero-media">
        <img src="/assets/process-control-visual.png" alt="Surface finishing automation and process control architecture">
        <div class="media-label">Equipment selection should connect to recipes, sensors, inspection and cost-per-part assumptions.</div>
      </div>
    </section>
    <section class="resource-main">
      <div class="split">
        <div>
          <h2>Application Fit</h2>
          <p>${page.title} should be selected around the surface result, part geometry, production rate and downstream process. In a line project, the machine also has to match loading, unloading, cleaning, drying and inspection requirements.</p>
          <ul>${page.fit.map((item) => `<li>${item}</li>`).join("")}</ul>
          <h2>Specification Points</h2>
          <p>Include these details in the RFQ so suppliers can quote comparable systems and avoid hidden integration gaps.</p>
          <ul>${page.specs.map((item) => `<li>${item}</li>`).join("")}</ul>
          <h2>Integration Notes</h2>
          <p>For a complete production line, the machine should not be specified alone. Confirm part transfer, carryover control, dust or mist collection, utility demand, maintenance access, recipes, alarms and acceptance testing.</p>
        </div>
        <aside class="mini-specs">
          <h3>Related resources</h3>
          <div class="footer-links">${related}<a href="/surface-finishing-lines/">Surface Finishing Lines</a></div>
        </aside>
      </div>
    </section>
    <section class="cta-band" id="contact">
      <div class="cta-inner">
        <div>
          <p class="eyebrow">Equipment integration</p>
          <h2>Define this machine as part of the full line.</h2>
          <p>Share your part geometry, current defect, target surface result and production volume. The response should connect machine selection to line balance, cleaning, drying, inspection and ROI.</p>
        </div>
        ${leadForm(false)}
      </div>
    </section>`;

  return layout({
    title: `${page.title} | Surface Finishing Equipment Guide`,
    description: page.description,
    active: "",
    canonical: `/${page.slug}/`,
    body,
  });
}

function notFoundPage() {
  return layout({
    title: "Page Not Found | SurfaceLine Systems",
    description: "The requested surface finishing resource could not be found.",
    active: "",
    canonical: "/404.html",
    body: `<section class="hero resource-hero"><div class="hero-copy"><p class="eyebrow">404</p><h1>Page not found</h1><p>The requested resource is not available. Start with the surface finishing line guide or request an engineering concept study.</p><div class="hero-actions"><a class="button" href="/surface-finishing-lines/">Open guide</a><a class="button-secondary" href="/">Home</a></div></div><div class="hero-media"><img src="/assets/surface-line-visual.png" alt="Automated surface finishing line"></div></section>`,
  });
}

function sitemap() {
  const urls = ["/", "/surface-finishing-lines/", ...resourcePages.map((page) => `/${page.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE_URL}${url}</loc></url>`).join("\n")}
</urlset>`;
}

function robots() {
  return `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;
}

writeFile(path.join(ROOT, "index.html"), homePage());
writeFile(path.join(ROOT, "surface-finishing-lines", "index.html"), articlePage());
resourcePages.forEach((page) => writeFile(path.join(ROOT, page.slug, "index.html"), resourcePage(page)));
writeFile(path.join(ROOT, "404.html"), notFoundPage());
writeFile(path.join(ROOT, "sitemap.xml"), sitemap());
writeFile(path.join(ROOT, "robots.txt"), robots());

