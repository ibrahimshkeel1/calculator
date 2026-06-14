const COLORS = {
  closed: "#22c55e", open: "#ef4444", progress: "#f97316",
  ua: "#2563eb", uc: "#f97316", good: "#22c55e",
  bars: ["#2563eb", "#f97316", "#22c55e", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444"],
};

function fmt(n) { return Number(n).toLocaleString(); }
function pct(part, total) { return total ? ((part / total) * 100).toFixed(1) : "0.0"; }
function isNarrow(w) { return w < 520; }

function topEntries(obj, n = 10) {
  return Object.entries(obj || {})
    .filter(([k]) => k && !["Unknown", "N/A", ""].includes(k))
    .sort((a, b) => b[1] - a[1]).slice(0, n);
}

function monthLabel(key) {
  if (!key || key === "Unknown") return key;
  const [y, m] = key.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[Number(m) - 1]} '${y.slice(2)}`;
}

function normalize(data) {
  const ua = data.sheet1_ua_uc || data.ua_uc_2025;
  const good = data.sheet2_good_obs || data.good_obs_2025;
  if (ua && !ua.ua_uc_type && ua.type_breakdown) ua.ua_uc_type = ua.type_breakdown;
  return {
    ...data, ua, good,
    openItems: data.open_items || data.open_items_sample || [],
    insights: data.insights || [],
  };
}

function setupCanvas(canvas, h = 300) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.parentElement.clientWidth || 800;
  canvas.width = w * dpr; canvas.height = h * dpr;
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

function drawGroupedBars(canvas, groups, series, colors) {
  const { ctx, w, h } = setupCanvas(canvas, canvas.getAttribute("height") | 0 || 300);
  const narrow = isNarrow(w);
  const pad = { top: 30, right: 12, bottom: narrow ? 56 : 50, left: 40 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;
  const maxVal = Math.max(...groups.flatMap((_, i) => series.map((s) => s.data[i] || 0)), 1) * 1.1;
  ctx.clearRect(0, 0, w, h);
  const groupW = plotW / Math.max(groups.length, 1);
  const barW = Math.min(narrow ? 12 : 22, groupW / (series.length + 1));
  groups.forEach((label, gi) => {
    const gx = pad.left + gi * groupW + groupW / 2;
    series.forEach((s, si) => {
      const val = s.data[gi] || 0;
      const bh = (val / maxVal) * plotH;
      const x = gx - (series.length * (barW + 4)) / 2 + si * (barW + 4);
      ctx.fillStyle = colors[si] || COLORS.bars[si];
      ctx.fillRect(x, pad.top + plotH - bh, barW, bh);
      if (bh > 16) {
        ctx.fillStyle = "#e2e8f0"; ctx.font = `${narrow ? 8 : 9}px system-ui,sans-serif`; ctx.textAlign = "center";
        ctx.fillText(val, x + barW / 2, pad.top + plotH - bh - 4);
      }
    });
    ctx.fillStyle = "#e2e8f0"; ctx.font = `${narrow ? 8 : 10}px system-ui,sans-serif`; ctx.textAlign = "center";
    ctx.fillText(label, gx, h - 12);
  });
  ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke();
}

function drawHorizontalBars(canvas, entries, color = "#2563eb") {
  if (!canvas || !entries.length) return;
  const { ctx, w, h } = setupCanvas(canvas, canvas.getAttribute("height") | 0 || 300);
  const narrow = isNarrow(w);
  const pad = { top: 10, right: narrow ? 32 : 50, bottom: 10, left: narrow ? 72 : 140 };
  const rowH = Math.min(narrow ? 22 : 26, (h - pad.top - pad.bottom) / entries.length);
  const plotW = w - pad.left - pad.right;
  const maxVal = Math.max(...entries.map((e) => e[1]), 1);
  const labelMax = narrow ? 9 : 20;
  ctx.clearRect(0, 0, w, h);
  entries.forEach(([label, val], i) => {
    const y = pad.top + i * rowH;
    const bw = (val / maxVal) * plotW;
    const text = label.length > labelMax ? label.slice(0, labelMax - 1) + "…" : label;
    ctx.fillStyle = "#e2e8f0"; ctx.font = `${narrow ? 9 : 11}px system-ui,sans-serif`; ctx.textAlign = "right";
    ctx.fillText(text, pad.left - 6, y + rowH * 0.65);
    ctx.fillStyle = color; ctx.fillRect(pad.left, y + 3, bw, rowH - 6);
    ctx.fillStyle = "#f8fafc"; ctx.textAlign = "left";
    ctx.fillText(fmt(val), pad.left + bw + 4, y + rowH * 0.65);
  });
}

function drawDonut(canvas, segments) {
  const baseH = canvas.getAttribute("height") | 0 || 260;
  const preNarrow = (canvas.parentElement?.clientWidth || 800) < 520;
  if (preNarrow) canvas.setAttribute("height", Math.max(baseH, 300));
  const { ctx, w, h } = setupCanvas(canvas, canvas.getAttribute("height") | 0 || 260);
  const narrow = isNarrow(w);
  const cx = w / 2, cy = narrow ? h * 0.36 : h / 2 - 10;
  const r = Math.min(w, h) * (narrow ? 0.26 : 0.32);
  const total = segments.reduce((s, [, v]) => s + v, 0) || 1;
  let start = -Math.PI / 2;
  ctx.clearRect(0, 0, w, h);
  segments.forEach(([, val, color]) => {
    const angle = (val / total) * Math.PI * 2;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.fillStyle = color;
    ctx.arc(cx, cy, r, start, start + angle); ctx.closePath(); ctx.fill();
    start += angle;
  });
  ctx.beginPath(); ctx.fillStyle = "#111827"; ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fbbf24"; ctx.font = `bold ${narrow ? 18 : 22}px system-ui,sans-serif`; ctx.textAlign = "center";
  ctx.fillText(fmt(total), cx, cy + 4);
  ctx.fillStyle = "#e2e8f0"; ctx.font = `${narrow ? 10 : 11}px system-ui,sans-serif`; ctx.fillText("Total", cx, cy + 20);
  let ly = narrow ? cy + r + 20 : h - 8;
  const fs = narrow ? 10 : 12;
  segments.forEach(([label, val, color]) => {
    if (narrow) {
      ctx.fillStyle = color; ctx.fillRect(w / 2 - 80, ly - 9, 8, 8);
      ctx.fillStyle = "#f1f5f9"; ctx.font = `${fs}px system-ui,sans-serif`; ctx.textAlign = "left";
      ctx.fillText(`${label}: ${fmt(val)} (${pct(val, total)}%)`, w / 2 - 68, ly);
      ly += 15;
    } else {
      ctx.fillStyle = color; ctx.fillRect(16, ly - 10, 10, 10);
      ctx.fillStyle = "#f1f5f9"; ctx.font = `${fs}px system-ui,sans-serif`; ctx.textAlign = "left";
      ctx.fillText(`${label}: ${fmt(val)} (${pct(val, total)}%)`, 32, ly);
      ly -= 16;
    }
  });
}

function statTable(title, rows) {
  return `<div class="hse-stat-block"><h3 class="method-heading">${title}</h3>
    <table class="results-table"><tbody>
    ${rows.map(([k, v]) => `<tr><td>${k}</td><td class="gas-num-cell">${fmt(v)}</td></tr>`).join("")}
    </tbody></table></div>`;
}

function renderBanner(d) {
  document.getElementById("hse-title").textContent = d.title;
  document.getElementById("hse-subtitle").textContent =
    `${d.period} · ${d.field} · Sheet 1 & Sheet 2`;
  const ua = d.ua, good = d.good;
  document.getElementById("hse-banner").innerHTML = `
    <div class="gas-banner-grid">
      <div class="gas-banner-item"><span class="gas-banner-label">Sheet 1</span><span class="gas-banner-value">UA/UC — ${fmt(ua.total)} records</span></div>
      <div class="gas-banner-item"><span class="gas-banner-label">Sheet 2</span><span class="gas-banner-value">Good Obs — ${fmt(good.total)} records</span></div>
      <div class="gas-banner-item"><span class="gas-banner-label">Closure Rate</span><span class="gas-banner-value">${d.closure_rate_pct}% closed</span></div>
      <div class="gas-banner-item"><span class="gas-banner-label">Open / Overdue</span><span class="gas-banner-value">${fmt(ua.status?.Open || 0)} open · ${fmt(ua.overdue_open || 0)} overdue</span></div>
    </div>`;
}

function renderInsights(d) {
  document.getElementById("hse-insights").innerHTML = `
    <h3 class="method-heading">Key Findings</h3>
    <ul class="method-list hse-insight-list">
      ${d.insights.map((i) => `<li>${i}</li>`).join("")}
    </ul>`;
}

function renderKpi(d) {
  const u = d.ua, g = d.good;
  document.getElementById("hse-kpi").innerHTML = `
    <article class="gas-kpi-card gas-kpi-raw">
      <div class="gas-kpi-head"><h3 class="gas-kpi-title">Sheet 1 — UA/UC</h3><p class="gas-kpi-loc">${fmt(u.total)} reports · ${d.closure_rate_pct}% closed</p></div>
      <dl class="gas-kpi-metrics">
        <div class="gas-kpi-metric primary"><dt>Unsafe Conditions</dt><dd>${fmt(u.ua_uc_type?.["Unsafe Condition"] || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>Unsafe Acts</dt><dd>${fmt(u.ua_uc_type?.["Unsafe Act"] || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>Open / Overdue</dt><dd>${fmt(u.status?.Open || 0)} / ${fmt(u.overdue_open || 0)}</dd></div>
      </dl>
    </article>
    <article class="gas-kpi-card gas-kpi-permeate">
      <div class="gas-kpi-head"><h3 class="gas-kpi-title">Sheet 2 — Good Obs</h3><p class="gas-kpi-loc">${fmt(g.total)} positive reports</p></div>
      <dl class="gas-kpi-metrics">
        <div class="gas-kpi-metric primary"><dt>Good : UA/UC Ratio</dt><dd>${pct(g.total, u.total)}%</dd></div>
        <div class="gas-kpi-metric"><dt>BBS Monitoring</dt><dd>${fmt(g.monitoring?.BBS || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>Safety Category</dt><dd>${pct(g.category?.Safety || 0, g.total)}%</dd></div>
      </dl>
    </article>
    <article class="gas-kpi-card gas-kpi-product">
      <div class="gas-kpi-head"><h3 class="gas-kpi-title">Hazard Profile</h3><p class="gas-kpi-loc">From Sheet 1 UA/UC</p></div>
      <dl class="gas-kpi-metrics">
        <div class="gas-kpi-metric primary"><dt>SWA Applied</dt><dd>${fmt(u.swa?.Yes || 0)} <small>${pct(u.swa?.Yes, u.total)}%</small></dd></div>
        <div class="gas-kpi-metric"><dt>Medium Risk</dt><dd>${fmt(u.risk?.Medium || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>PSF Flagged</dt><dd>${fmt(d.hazard_analysis?.psf_applicable_count || 0)}</dd></div>
      </dl>
    </article>`;
}

function renderMonthly(d) {
  const months = Object.keys(d.ua.monthly).filter((m) => m !== "Unknown").sort();
  drawGroupedBars(document.getElementById("hse-monthly-chart"), months.map(monthLabel), [
    { data: months.map((m) => d.ua.monthly[m] || 0) },
    { data: months.map((m) => d.good.monthly[m] || 0) },
  ], ["#ef4444", "#22c55e"]);
}

function renderStatus(d) {
  const u = d.ua;
  const segs = [["Closed", u.status.Closed || 0, COLORS.closed], ["Open", u.status.Open || 0, COLORS.open],
    ["In Progress", u.status["In Progress"] || 0, COLORS.progress]].filter((s) => s[1] > 0);
  drawDonut(document.getElementById("hse-status-chart"), segs);
  document.getElementById("hse-status-table").innerHTML = `<table class="results-table"><thead><tr><th>Status</th><th class="gas-num-cell">Count</th><th class="gas-num-cell">%</th></tr></thead><tbody>
    ${segs.map(([l, v]) => `<tr><td>${l}</td><td class="gas-num-cell">${fmt(v)}</td><td class="gas-num-cell">${pct(v, u.total)}%</td></tr>`).join("")}
    </tbody></table>`;
}

function renderTypeRisk(d) {
  const u = d.ua;
  drawDonut(document.getElementById("hse-type-chart"), [
    ["Unsafe Condition", u.ua_uc_type?.["Unsafe Condition"] || 0, COLORS.uc],
    ["Unsafe Act", u.ua_uc_type?.["Unsafe Act"] || 0, COLORS.ua],
  ]);
  document.getElementById("hse-risk-block").innerHTML = `<div class="hse-mini-stats">
    <div class="summary-item"><span class="summary-label">Low Risk</span><span class="summary-value">${fmt(u.risk.Low || 0)} (${pct(u.risk.Low, u.total)}%)</span></div>
    <div class="summary-item highlight"><span class="summary-label">Medium Risk</span><span class="summary-value">${fmt(u.risk.Medium || 0)}</span></div>
    <div class="summary-item"><span class="summary-label">Overdue Open</span><span class="summary-value">${fmt(u.overdue_open || 0)}</span></div>
  </div>`;
}

function renderSheet1(d) {
  const u = d.ua;
  document.getElementById("sheet1-hint").textContent =
    `${u.total} records · ${u.columns} columns · ${u.status.Closed || 0} closed, ${u.status.Open || 0} open, ${u.overdue_open || 0} overdue`;
  drawHorizontalBars(document.getElementById("sheet1-dept-chart"), topEntries(u.department, 10));
  drawHorizontalBars(document.getElementById("sheet1-golden-chart"), topEntries(u.golden_rules, 10), "#f97316");
  document.getElementById("sheet1-tables").innerHTML =
    statTable("By Company", topEntries(u.company, 8)) +
    statTable("Top Locations", topEntries(u.top_locations || u.location, 8)) +
    statTable("Action Party", topEntries(u.action_party, 8)) +
    statTable("PSF Applicable", topEntries(u.psf, 5)) +
    statTable("Observation Category", topEntries(u.category, 5)) +
    statTable("Open by Dept", topEntries(u.open_by_department, 8));
}

function renderSheet2(d) {
  const g = d.good;
  document.getElementById("sheet2-hint").textContent =
    `${g.total} good observations · ${g.category.Safety || 0} safety (${pct(g.category.Safety, g.total)}%)`;
  drawHorizontalBars(document.getElementById("sheet2-dept-chart"), topEntries(g.department, 10), "#22c55e");
  document.getElementById("sheet2-monitoring").innerHTML = `<table class="results-table"><thead><tr><th>Point</th><th class="gas-num-cell">Count</th><th class="gas-num-cell">%</th></tr></thead><tbody>
    ${topEntries(g.monitoring, 8).map(([k, v]) => `<tr><td>${k}</td><td class="gas-num-cell">${fmt(v)}</td><td class="gas-num-cell">${pct(v, g.total)}%</td></tr>`).join("")}
    </tbody></table>`;
}

function renderCombined(d) {
  const mon = topEntries(d.ua.monitoring, 7);
  document.getElementById("hse-monitoring").innerHTML = `<table class="results-table"><thead><tr><th>Point</th><th class="gas-num-cell">Sheet 1</th><th class="gas-num-cell">Sheet 2</th></tr></thead><tbody>
    ${mon.map(([k, v]) => `<tr><td>${k}</td><td class="gas-num-cell">${fmt(v)}</td><td class="gas-num-cell">${fmt(d.good.monitoring?.[k] || 0)}</td></tr>`).join("")}
    </tbody></table>`;
  const locs = topEntries(d.ua.top_locations || {}, 8);
  const reps = topEntries(d.ua.top_reporters || {}, 8);
  document.getElementById("hse-top-lists").innerHTML = `<div class="hse-list-grid">
    <div><h3 class="method-heading">Top Locations (UA/UC)</h3><ol class="hse-ranked-list">${locs.map(([n, c]) => `<li><span>${n}</span><strong>${fmt(c)}</strong></li>`).join("")}</ol></div>
    <div><h3 class="method-heading">Top Reporters (UA/UC)</h3><ol class="hse-ranked-list">${reps.map(([n, c]) => `<li><span>${n}</span><strong>${fmt(c)}</strong></li>`).join("")}</ol></div>
  </div>`;
}

function renderHazard(d) {
  const h = d.hazard_analysis;
  if (!h) return;

  document.getElementById("hse-hazard-summary").innerHTML = `
    <h3 class="method-heading">Executive Summary</h3>
    <ul class="method-list hse-insight-list">
      <li><strong>Most hazardous zones:</strong> Camp &amp; Living Areas (${fmt(h.area_groups["Camp & Living Areas"] || 0)} events), Plant &amp; Processing (${fmt(h.area_groups["Plant & Processing"] || 0)}), Wellheads (${fmt(h.area_groups["Wellheads / Production"] || 0)}).</li>
      <li><strong>Top locations:</strong> Camp-1 (${fmt(h.top_hazard_locations["Camp-1"] || 0)}), Camp-2 (${fmt(h.top_hazard_locations["Camp-2"] || 0)}), PV Plant (${fmt(h.top_hazard_locations["PV Plant"] || 0)}).</li>
      <li><strong>Critical hazard types:</strong> PPE non-compliance, work at height, slip/trip/fall, process safety/isolation, driving safety, fire safety.</li>
      <li><strong>Medium-risk events:</strong> ${fmt(h.medium_risk_total)} total · <strong>PSF-applicable:</strong> ${fmt(h.psf_applicable_count)} · <strong>Open high-concern:</strong> ${fmt(h.open_high_concern?.length || 0)}</li>
    </ul>`;

  const themes = topEntries(h.hazard_themes, 10);
  drawHorizontalBars(document.getElementById("hazard-theme-chart"), themes, "#ef4444");

  const areas = Object.entries(h.area_groups || {}).sort((a, b) => b[1] - a[1]);
  drawHorizontalBars(document.getElementById("hazard-area-chart"), areas, "#f97316");

  const locs = topEntries(h.top_hazard_locations, 12);
  document.getElementById("hazard-locations").innerHTML = `<table class="results-table"><thead><tr>
    <th>Location</th><th class="gas-num-cell">Total</th><th class="gas-num-cell">Medium</th></tr></thead><tbody>
    ${locs.map(([loc]) => `<tr><td>${loc}</td><td class="gas-num-cell">${fmt(h.top_hazard_locations[loc])}</td>
      <td class="gas-num-cell">${fmt(h.medium_risk_by_location?.[loc] || 0)}</td></tr>`).join("")}
    </tbody></table>`;

  const openG = topEntries(h.open_by_golden, 8);
  document.getElementById("hazard-open-golden").innerHTML = `<table class="results-table"><thead><tr>
    <th>Golden Rule</th><th class="gas-num-cell">Open Items</th></tr></thead><tbody>
    ${openG.map(([k, v]) => `<tr><td>${k}</td><td class="gas-num-cell">${fmt(v)}</td></tr>`).join("")}
    </tbody></table>`;

  document.getElementById("hazard-recommendations").innerHTML = (h.recommendations || []).map((r) => `
    <div class="hse-rec-card hse-rec-${r.priority.toLowerCase()}">
      <span class="hse-rec-priority">${r.priority}</span>
      <h4 class="hse-rec-title">${r.area}</h4>
      <p class="hse-rec-finding">${r.finding}</p>
      <p class="hse-rec-action"><strong>Action:</strong> ${r.action}</p>
    </div>`).join("");

  const concerns = [...(h.medium_risk_samples || []), ...(h.open_high_concern || [])].slice(0, 15);
  document.getElementById("hazard-concern-body").innerHTML = concerns.map((r) => `<tr>
    <td class="gas-num-cell">${r.sr ?? ""}</td><td>${r.loc ?? r.location ?? ""}</td>
    <td>${r.golden ?? ""}</td><td>${r.risk ?? ""}</td>
    <td>${r.status ?? (r.overdue ? "Open (overdue)" : "")}</td>
    <td class="hse-desc-cell">${r.desc ?? r.description ?? ""}</td></tr>`).join("");
}

function renderOpen(d) {
  const open = d.ua.status?.Open || 0;
  const items = d.openItems;
  document.getElementById("hse-open-summary").textContent =
    `${open} open items (${d.ua.overdue_open || 0} past deadline). Showing ${items.length} records.`;
  document.getElementById("hse-open-body").innerHTML = items.map((r) => `<tr>
    <td class="gas-num-cell">${r.sr ?? ""}</td><td>${r.name ?? ""}</td><td>${r.dept ?? ""}</td>
    <td>${String(r.date).split(" at")[0]}</td><td>${String(r.deadline || "").split(" at")[0]}</td>
    <td>${r.location ?? ""}</td><td>${r.type ?? ""}</td><td>${r.risk ?? ""}</td>
    <td>${r.action ?? ""}</td><td class="hse-desc-cell">${r.description ?? ""}</td></tr>`).join("");
}

function renderAll(raw) {
  const d = normalize(raw);
  renderBanner(d); renderInsights(d); renderKpi(d); renderMonthly(d);
  renderStatus(d); renderTypeRisk(d);
  renderSheet1(d); renderSheet2(d);
  renderCombined(d); renderHazard(d); renderOpen(d);
}

function watchLayoutResize(render) {
  const root = document.querySelector(".hse-page");
  if (!root) return;
  let lastW = root.clientWidth;
  let timer;
  const ro = new ResizeObserver(() => {
    const w = root.clientWidth;
    if (Math.abs(w - lastW) < 12) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      lastW = w;
      render();
    }, 200);
  });
  ro.observe(root);
  window.addEventListener("orientationchange", () => {
    setTimeout(() => {
      lastW = 0;
      render();
    }, 350);
  });
}

async function init() {
  try {
    const res = await fetch("hse-data.json");
    if (!res.ok) throw new Error("Could not load hse-data.json");
    const data = await res.json();
    renderAll(data);
    window.__hseData = data;
    watchLayoutResize(() => renderAll(window.__hseData));
  } catch (err) {
    document.getElementById("hse-subtitle").textContent = "Failed to load data.";
    console.error(err);
  }
}
init();
