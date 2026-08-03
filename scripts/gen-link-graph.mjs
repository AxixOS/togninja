// Generates a self-contained interactive link graph of the REAL internal-link
// structure of newagefotografie.com, extracted from the site's linking
// components (ContextualLinks, RelatedServices, RelatedTopicsBlock), the
// homepage body, and the public route set. Edges below are the *editorial /
// contextual* links — the ones that actually concentrate topical authority —
// NOT the global nav/footer (which links ~every page to ~every page uniformly
// and is reported separately in the assessment).
import { writeFileSync } from "fs";

// --- Node classification (per the ideal pillar/cluster/trust/conversion model)
const TYPE = {
  "/": "home",
  // Pillars (de-facto cluster hubs / money pages)
  "/familienfotos-wien/": "pillar",
  "/business-portrait-wien/": "pillar",
  "/hochzeitsfotografie-wien/": "pillar",
  "/studio-fotografie-wien/": "pillar",
  // Clusters
  "/familien-fotoshooting-wien/": "cluster",
  "/neugeborenenfotos-wien/": "cluster",
  "/babyfotos-wien/": "cluster",
  "/baby-fotografie-wien/": "cluster",
  "/schwangerschaftsfotos-wien/": "cluster",
  "/kinder-fotografie-wien/": "cluster",
  "/bewerbungsfotos-wien/": "cluster",
  "/teamfotos-wien/": "cluster",
  "/portrait-fotografie-wien/": "cluster",
  "/eventfotografie-wien/": "cluster",
  "/produkt-fotografie-wien/": "cluster",
  "/immobilien-fotografie-wien/": "cluster",
  // Trust / supporting
  "/ueber-uns/": "trust",
  "/kundenstimmen/": "trust",
  "/faq/": "trust",
  "/portfolio": "trust",
  "/blog": "trust",
  // Conversion
  "/kontakt": "conversion",
  "/warteliste": "conversion",
  "/preise/": "conversion",
  "/fotoshooting-preise-wien/": "conversion",
  "/vouchers": "conversion",
  // Other
  "/fotoshootings": "other",
};

const CLUSTER = {
  "/familienfotos-wien/": "family", "/familien-fotoshooting-wien/": "family",
  "/neugeborenenfotos-wien/": "family", "/babyfotos-wien/": "family",
  "/baby-fotografie-wien/": "family", "/schwangerschaftsfotos-wien/": "family",
  "/kinder-fotografie-wien/": "family",
  "/business-portrait-wien/": "business", "/bewerbungsfotos-wien/": "business",
  "/teamfotos-wien/": "business", "/portrait-fotografie-wien/": "business",
  "/hochzeitsfotografie-wien/": "event", "/eventfotografie-wien/": "event",
  "/studio-fotografie-wien/": "studio", "/produkt-fotografie-wien/": "studio",
  "/immobilien-fotografie-wien/": "studio",
};

const LABEL = {
  "/": "Home", "/fotoshootings": "Fotoshootings (overview)",
  "/familienfotos-wien/": "Familienfotos", "/familien-fotoshooting-wien/": "Familien-Fotoshooting",
  "/neugeborenenfotos-wien/": "Neugeborenenfotos", "/babyfotos-wien/": "Babyfotos",
  "/baby-fotografie-wien/": "Baby-Fotografie", "/schwangerschaftsfotos-wien/": "Schwangerschaftsfotos",
  "/kinder-fotografie-wien/": "Kinderfotografie", "/business-portrait-wien/": "Business Portrait",
  "/bewerbungsfotos-wien/": "Bewerbungsfotos", "/teamfotos-wien/": "Teamfotos",
  "/portrait-fotografie-wien/": "Portraitfotografie", "/hochzeitsfotografie-wien/": "Hochzeitsfotografie",
  "/eventfotografie-wien/": "Eventfotografie", "/studio-fotografie-wien/": "Studio-Fotografie",
  "/produkt-fotografie-wien/": "Produktfotografie", "/immobilien-fotografie-wien/": "Immobilienfotografie",
  "/ueber-uns/": "Über uns", "/kundenstimmen/": "Kundenstimmen", "/faq/": "FAQ",
  "/portfolio": "Portfolio", "/blog": "Blog", "/kontakt": "Kontakt",
  "/warteliste": "Warteliste", "/preise/": "Preise", "/fotoshooting-preise-wien/": "Fotoshooting Preise",
  "/vouchers": "Gutscheine",
};

// --- Editorial out-links per page (union of the three SEO components + homepage)
const OUT = {
  "/": ["/familienfotos-wien/","/neugeborenenfotos-wien/","/schwangerschaftsfotos-wien/","/business-portrait-wien/","/hochzeitsfotografie-wien/","/studio-fotografie-wien/","/familien-fotoshooting-wien/","/baby-fotografie-wien/","/eventfotografie-wien/","/produkt-fotografie-wien/","/fotoshootings","/babyfotos-wien/","/fotoshooting-preise-wien/","/kontakt","/warteliste","/portfolio","/preise/"],
  "/familienfotos-wien/": ["/familien-fotoshooting-wien/","/neugeborenenfotos-wien/","/schwangerschaftsfotos-wien/","/babyfotos-wien/","/kinder-fotografie-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/familien-fotoshooting-wien/": ["/familienfotos-wien/","/kinder-fotografie-wien/","/neugeborenenfotos-wien/","/babyfotos-wien/","/schwangerschaftsfotos-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/babyfotos-wien/": ["/neugeborenenfotos-wien/","/schwangerschaftsfotos-wien/","/familienfotos-wien/","/kinder-fotografie-wien/","/baby-fotografie-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/baby-fotografie-wien/": ["/babyfotos-wien/","/neugeborenenfotos-wien/","/familienfotos-wien/","/kinder-fotografie-wien/","/schwangerschaftsfotos-wien/","/preise/","/warteliste","/portfolio"],
  "/neugeborenenfotos-wien/": ["/schwangerschaftsfotos-wien/","/babyfotos-wien/","/familienfotos-wien/","/familien-fotoshooting-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/schwangerschaftsfotos-wien/": ["/neugeborenenfotos-wien/","/babyfotos-wien/","/familienfotos-wien/","/familien-fotoshooting-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/kinder-fotografie-wien/": ["/familienfotos-wien/","/babyfotos-wien/","/familien-fotoshooting-wien/","/neugeborenenfotos-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/business-portrait-wien/": ["/teamfotos-wien/","/bewerbungsfotos-wien/","/portrait-fotografie-wien/","/eventfotografie-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/teamfotos-wien/": ["/business-portrait-wien/","/bewerbungsfotos-wien/","/portrait-fotografie-wien/","/eventfotografie-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/bewerbungsfotos-wien/": ["/business-portrait-wien/","/portrait-fotografie-wien/","/teamfotos-wien/","/studio-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/portrait-fotografie-wien/": ["/business-portrait-wien/","/bewerbungsfotos-wien/","/familienfotos-wien/","/studio-fotografie-wien/","/teamfotos-wien/","/preise/","/warteliste","/portfolio"],
  "/eventfotografie-wien/": ["/hochzeitsfotografie-wien/","/business-portrait-wien/","/teamfotos-wien/","/portrait-fotografie-wien/","/familienfotos-wien/","/preise/","/warteliste","/portfolio"],
  "/hochzeitsfotografie-wien/": ["/eventfotografie-wien/","/familienfotos-wien/","/portrait-fotografie-wien/","/business-portrait-wien/","/preise/","/warteliste","/portfolio"],
  "/studio-fotografie-wien/": ["/familienfotos-wien/","/neugeborenenfotos-wien/","/business-portrait-wien/","/portrait-fotografie-wien/","/produkt-fotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/produkt-fotografie-wien/": ["/studio-fotografie-wien/","/business-portrait-wien/","/immobilien-fotografie-wien/","/eventfotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/immobilien-fotografie-wien/": ["/produkt-fotografie-wien/","/business-portrait-wien/","/studio-fotografie-wien/","/eventfotografie-wien/","/preise/","/warteliste","/portfolio"],
  "/portfolio": ["/familienfotos-wien/","/babyfotos-wien/","/business-portrait-wien/","/warteliste"],
  "/ueber-uns/": ["/familienfotos-wien/","/kundenstimmen/","/kontakt","/fotoshooting-preise-wien/"],
  "/kundenstimmen/": ["/portfolio","/warteliste","/familienfotos-wien/","/business-portrait-wien/"],
  "/kontakt": ["/familienfotos-wien/","/business-portrait-wien/","/warteliste","/vouchers"],
  "/preise/": ["/familienfotos-wien/","/neugeborenenfotos-wien/","/business-portrait-wien/","/vouchers"],
  "/fotoshooting-preise-wien/": ["/familienfotos-wien/","/babyfotos-wien/","/business-portrait-wien/","/preise/","/kontakt"],
  "/blog": ["/familienfotos-wien/","/babyfotos-wien/","/business-portrait-wien/","/warteliste","/fotoshooting-preise-wien/"],
  "/faq/": [], // <-- orphan: no editorial out-links (only reachable via footer)
};

// --- Build graph
const nodeIds = new Set(Object.keys(TYPE));
const edges = [];
const seen = new Set();
for (const [src, targets] of Object.entries(OUT)) {
  for (const t of targets) {
    nodeIds.add(t);
    const key = src + "->" + t;
    if (!seen.has(key) && src !== t) { seen.add(key); edges.push({ source: src, target: t }); }
  }
}
const inCount = {}, outCount = {};
for (const id of nodeIds) { inCount[id] = 0; outCount[id] = 0; }
for (const e of edges) { outCount[e.source]++; inCount[e.target]++; }

const nodes = [...nodeIds].map((id) => ({
  id,
  label: LABEL[id] || id,
  type: TYPE[id] || "other",
  cluster: CLUSTER[id] || "none",
  inLinks: inCount[id],
  outLinks: outCount[id],
}));

// --- Console stats
const pillars = nodes.filter(n => n.type === "pillar");
console.log(`\nNodes: ${nodes.length}  |  Editorial edges: ${edges.length}`);
console.log("\nPillar authority (editorial in-links):");
pillars.forEach(p => console.log(`  ${p.label.padEnd(22)} in:${p.inLinks}  out:${p.outLinks}`));
const orphans = nodes.filter(n => n.inLinks === 0 && n.outLinks === 0);
const noUp = nodes.filter(n => n.inLinks === 0);
console.log(`\nFully orphaned (no editorial links either way): ${orphans.map(n=>n.label).join(", ") || "none"}`);
console.log(`No editorial in-links (only nav/footer reachable): ${noUp.map(n=>n.label).join(", ") || "none"}`);

// --- Emit HTML
const COLORS = { home:"#0f172a", pillar:"#1e3a8a", cluster:"#0d9488", trust:"#64748b", conversion:"#ea580c", other:"#a855f7" };
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Age Fotografie — Real Link Graph</title>
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<style>
 body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;color:#0f172a}
 header{padding:18px 28px;border-bottom:1px solid #e2e8f0;background:#fff}
 h1{margin:0 0 4px;font-size:20px}.sub{color:#475569;font-size:13px}
 .wrap{display:flex;gap:0;height:calc(100vh - 78px)}
 svg{flex:1;background:radial-gradient(circle at 50% 40%, #fff, #f1f5f9)}
 aside{width:300px;border-left:1px solid #e2e8f0;background:#fff;padding:18px;overflow:auto;font-size:13px}
 .legend div{display:flex;align-items:center;gap:8px;margin:6px 0}
 .dot{width:13px;height:13px;border-radius:50%}
 .stat{font-size:26px;font-weight:700}.muted{color:#64748b}
 .node text{font-size:10px;pointer-events:none}
 .badge{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;color:#fff;margin-left:6px}
 h3{margin:18px 0 6px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:#475569}
 li{margin:3px 0}
</style></head><body>
<header><h1>New Age Fotografie — Real Internal Link Graph</h1>
<div class="sub">Editorial / contextual links only (the links that actually concentrate authority) — global nav &amp; footer excluded. Hover a node to trace its connections.</div></header>
<div class="wrap">
<svg id="g"></svg>
<aside>
 <div class="stat">${edges.length}</div><div class="muted">editorial internal links</div>
 <div class="stat">${nodes.length}</div><div class="muted">pages in the graph</div>
 <h3>Node types</h3><div class="legend">
  <div><span class="dot" style="background:${COLORS.home}"></span>Home</div>
  <div><span class="dot" style="background:${COLORS.pillar}"></span>Pillar (money/hub)</div>
  <div><span class="dot" style="background:${COLORS.cluster}"></span>Cluster (service)</div>
  <div><span class="dot" style="background:${COLORS.trust}"></span>Trust / supporting</div>
  <div><span class="dot" style="background:${COLORS.conversion}"></span>Conversion</div>
 </div>
 <h3>Pillar authority (in-links)</h3><ul>
 ${pillars.sort((a,b)=>b.inLinks-a.inLinks).map(p=>`<li>${p.label} — <b>${p.inLinks}</b> in / ${p.outLinks} out</li>`).join("")}
 </ul>
 <h3>Weak zones</h3><ul>
 ${noUp.map(n=>`<li>${n.label} — 0 editorial in-links</li>`).join("") || "<li>none</li>"}
 </ul>
 <div id="info"></div>
</aside></div>
<script>
const nodes=${JSON.stringify(nodes)};const links=${JSON.stringify(edges)};
const COLORS=${JSON.stringify(COLORS)};
const svg=d3.select("#g"),W=()=>svg.node().clientWidth,H=()=>svg.node().clientHeight;
const sim=d3.forceSimulation(nodes)
 .force("link",d3.forceLink(links).id(d=>d.id).distance(70).strength(.5))
 .force("charge",d3.forceManyBody().strength(-260))
 .force("center",d3.forceCenter(W()/2,H()/2))
 .force("collide",d3.forceCollide(22));
const link=svg.append("g").attr("stroke","#cbd5e1").attr("stroke-opacity",.5)
 .selectAll("line").data(links).join("line").attr("stroke-width",1);
const node=svg.append("g").selectAll("g").data(nodes).join("g").attr("class","node")
 .call(d3.drag().on("start",ds).on("drag",dd).on("end",de));
node.append("circle")
 .attr("r",d=>d.type==="home"?14:d.type==="pillar"?11:6+Math.min(d.inLinks,8))
 .attr("fill",d=>COLORS[d.type]).attr("stroke","#fff").attr("stroke-width",1.5);
node.append("text").attr("x",10).attr("y",4).text(d=>d.label);
node.on("mouseover",(e,d)=>{
 const con=new Set([d.id]);links.forEach(l=>{if(l.source.id===d.id)con.add(l.target.id);if(l.target.id===d.id)con.add(l.source.id);});
 node.style("opacity",n=>con.has(n.id)?1:.12);
 link.attr("stroke",l=>l.source.id===d.id?"#0d9488":l.target.id===d.id?"#ea580c":"#cbd5e1")
     .attr("stroke-opacity",l=>(l.source.id===d.id||l.target.id===d.id)?.95:.05)
     .attr("stroke-width",l=>(l.source.id===d.id||l.target.id===d.id)?2:1);
 document.getElementById("info").innerHTML="<h3>"+d.label+"</h3><div class='muted'>"+d.id+"</div><p>"+d.outLinks+" out-links · "+d.inLinks+" in-links · type: "+d.type+"</p>";
}).on("mouseout",()=>{node.style("opacity",1);link.attr("stroke","#cbd5e1").attr("stroke-opacity",.5).attr("stroke-width",1);});
sim.on("tick",()=>{
 link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
 node.attr("transform",d=>"translate("+d.x+","+d.y+")");
});
function ds(e,d){if(!e.active)sim.alphaTarget(.3).restart();d.fx=d.x;d.fy=d.y;}
function dd(e,d){d.fx=e.x;d.fy=e.y;}
function de(e,d){if(!e.active)sim.alphaTarget(0);d.fx=null;d.fy=null;}
addEventListener("resize",()=>sim.force("center",d3.forceCenter(W()/2,H()/2)).alpha(.3).restart());
</script></body></html>`;
writeFileSync("link-graph.html", html);
console.log("\nWrote link-graph.html");
