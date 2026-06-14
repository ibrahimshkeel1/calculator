const COLORS = {
  good: "#22c55e", safety: "#22c55e", health: "#2563eb", env: "#14b8a6",
  bars: ["#22c55e", "#2563eb", "#14b8a6", "#a855f7", "#f97316", "#eab308"],
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
  const good = data.sheet2_good_obs || data.good_obs_2025;
  const ua = data.sheet1_ua_uc || data.ua_uc_2025;
  const insights = (data.insights || []).filter((i) => /sheet 2|good obs/i.test(i));
  const peak = Object.entries(good?.monthly || {})
    .filter(([k]) => k !== "Unknown")
    .sort((a, b) => b[1] - a[1])[0];
  const topRep = topEntries(good?.top_reporters, 1)[0];
  if (peak) insights.push(`Peak Good Obs month: ${peak[0]} (${peak[1]} reports).`);
  if (topRep) insights.push(`Top reporter: ${topRep[0]} (${topRep[1]} observations).`);
  if (ua?.total) insights.push(`Good Obs volume is ${pct(good?.total, ua.total)}% of UA/UC reports.`);
  return { ...data, good, ua, insights };
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
  const barW = Math.min(narrow ? 14 : 22, groupW / (series.length + 1));
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
  ctx.strokeStyle = "#22c55e"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH); ctx.stroke();
}

function drawHorizontalBars(canvas, entries, color = "#22c55e") {
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
  const g = d.good;
  document.getElementById("hse-subtitle").textContent =
    `${d.period} · ${d.field} · Sheet 2 — Good Observations`;
  document.getElementById("hse-banner").innerHTML = `
    <div class="gas-banner-grid">
      <div class="gas-banner-item"><span class="gas-banner-label">Records</span><span class="gas-banner-value">${fmt(g.total)} Good Obs</span></div>
      <div class="gas-banner-item"><span class="gas-banner-label">Safety Category</span><span class="gas-banner-value">${pct(g.category?.Safety, g.total)}%</span></div>
      <div class="gas-banner-item"><span class="gas-banner-label">BBS Monitoring</span><span class="gas-banner-value">${fmt(g.monitoring?.BBS || 0)}</span></div>
      <div class="gas-banner-item"><span class="gas-banner-label">vs UA/UC</span><span class="gas-banner-value">${pct(g.total, d.ua?.total)}% volume</span></div>
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
  const g = d.good;
  const topDept = topEntries(g.department, 1)[0];
  document.getElementById("hse-kpi").innerHTML = `
    <article class="gas-kpi-card gas-kpi-product">
      <div class="gas-kpi-head"><h3 class="gas-kpi-title">Good Observations</h3><p class="gas-kpi-loc">${fmt(g.total)} positive reports</p></div>
      <dl class="gas-kpi-metrics">
        <div class="gas-kpi-metric primary"><dt>Safety</dt><dd>${fmt(g.category?.Safety || 0)} <small>${pct(g.category?.Safety, g.total)}%</small></dd></div>
        <div class="gas-kpi-metric"><dt>Health</dt><dd>${fmt(g.category?.Health || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>Environment</dt><dd>${fmt(g.category?.Environment || 0)}</dd></div>
      </dl>
    </article>
    <article class="gas-kpi-card gas-kpi-permeate">
      <div class="gas-kpi-head"><h3 class="gas-kpi-title">Monitoring</h3><p class="gas-kpi-loc">How observations were captured</p></div>
      <dl class="gas-kpi-metrics">
        <div class="gas-kpi-metric primary"><dt>BBS</dt><dd>${fmt(g.monitoring?.BBS || 0)} <small>${pct(g.monitoring?.BBS, g.total)}%</small></dd></div>
        <div class="gas-kpi-metric"><dt>DHSER</dt><dd>${fmt(g.monitoring?.DHSER || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>Site Visit</dt><dd>${fmt(g.monitoring?.["Site Visit"] || 0)}</dd></div>
      </dl>
    </article>
    <article class="gas-kpi-card gas-kpi-raw">
      <div class="gas-kpi-head"><h3 class="gas-kpi-title">Engagement</h3><p class="gas-kpi-loc">Reporting activity</p></div>
      <dl class="gas-kpi-metrics">
        <div class="gas-kpi-metric primary"><dt>Top Dept</dt><dd class="hse-kpi-dept">${topDept?.[0] || "—"}</dd></div>
        <div class="gas-kpi-metric"><dt>Prime Co.</dt><dd>${fmt(g.company?.Prime || 0)}</dd></div>
        <div class="gas-kpi-metric"><dt>Icon Co.</dt><dd>${fmt(g.company?.Icon || 0)}</dd></div>
      </dl>
    </article>`;
}

function renderMonthly(d) {
  const months = Object.keys(d.good.monthly).filter((m) => m !== "Unknown").sort();
  drawGroupedBars(document.getElementById("hse-monthly-chart"), months.map(monthLabel), [
    { data: months.map((m) => d.good.monthly[m] || 0) },
  ], ["#22c55e"]);
}

function renderCategory(d) {
  const g = d.good;
  const cats = [
    ["Safety", g.category?.Safety || 0, COLORS.safety],
    ["Health", g.category?.Health || 0, COLORS.health],
    ["Environment", g.category?.Environment || 0, COLORS.env],
  ].filter((s) => s[1] > 0);
  drawDonut(document.getElementById("hse-category-chart"), cats);
  document.getElementById("hse-category-table").innerHTML = `<table class="results-table"><thead><tr><th>Category</th><th class="gas-num-cell">Count</th><th class="gas-num-cell">%</th></tr></thead><tbody>
    ${cats.map(([l, v]) => `<tr><td>${l}</td><td class="gas-num-cell">${fmt(v)}</td><td class="gas-num-cell">${pct(v, g.total)}%</td></tr>`).join("")}
    </tbody></table>`;
}

function renderMonitoring(d) {
  const g = d.good;
  const mon = topEntries(g.monitoring, 6);
  const colors = ["#22c55e", "#2563eb", "#f97316", "#a855f7", "#14b8a6", "#eab308"];
  drawDonut(document.getElementById("hse-monitoring-chart"),
    mon.map(([l, v], i) => [l, v, colors[i % colors.length]]));
  document.getElementById("hse-monitoring-summary").innerHTML = `<table class="results-table"><thead><tr><th>Point</th><th class="gas-num-cell">Count</th><th class="gas-num-cell">%</th></tr></thead><tbody>
    ${mon.map(([k, v]) => `<tr><td>${k}</td><td class="gas-num-cell">${fmt(v)}</td><td class="gas-num-cell">${pct(v, g.total)}%</td></tr>`).join("")}
    </tbody></table>`;
}

function renderSheet2(d) {
  const g = d.good;
  document.getElementById("sheet2-hint").textContent =
    `${g.total} records · ${g.columns} columns · ${g.category?.Safety || 0} safety (${pct(g.category?.Safety, g.total)}%)`;
  drawHorizontalBars(document.getElementById("sheet2-dept-chart"), topEntries(g.department, 10), "#22c55e");
  drawHorizontalBars(document.getElementById("sheet2-company-chart"), topEntries(g.company, 6), "#2563eb");
  document.getElementById("sheet2-tables").innerHTML =
    statTable("Top Locations", topEntries(g.top_locations, 10)) +
    statTable("Observation Type", topEntries(g.type_breakdown, 5)) +
    statTable("By Field", topEntries(g.field, 5)) +
    statTable("Monitoring", topEntries(g.monitoring, 8)) +
    statTable("Category", topEntries(g.category, 5));
}

function renderTopLists(d) {
  const g = d.good;
  const locs = topEntries(g.top_locations || {}, 15);
  const reps = topEntries(g.top_reporters || {}, 15);
  document.getElementById("hse-top-locations").innerHTML = `<ol class="hse-ranked-list">
    ${locs.map(([n, c]) => `<li><span>${n}</span><strong>${fmt(c)}</strong></li>`).join("")}
  </ol>`;
  document.getElementById("hse-top-reporters").innerHTML = `<ol class="hse-ranked-list">
    ${reps.map(([n, c]) => `<li><span>${n}</span><strong>${fmt(c)}</strong></li>`).join("")}
  </ol>`;
}

function renderAll(raw) {
  const d = normalize(raw);
  renderBanner(d); renderInsights(d); renderKpi(d); renderMonthly(d);
  renderCategory(d); renderMonitoring(d);
  renderSheet2(d); renderTopLists(d);
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
