'use strict';
 
/* ══════════════════════════════════════
   STATE
══════════════════════════════════════ */
let historyLog = [];
let savedSimulations = JSON.parse(localStorage.getItem('thermalWorkbenchData') || '[]');
 
/* ══════════════════════════════════════
   SECTION NAVIGATION
══════════════════════════════════════ */
const ALL_SECTIONS = [
  'dashboard','carnotCycle','ottoCycle','dieselCycle','rankineCycle',
  'braytonCycle','refrigerationCycle','heatExchanger','comparisonDashboard',
  'propertyDatabase','steamProperties','advancedAnalysis','formulaLibrary',
  'savedSimulations','reportCenter'
];
 
function showSection(id) {
  ALL_SECTIONS.forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) {
    target.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
 
// Keyboard accessibility for dash cards
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('dash-card')) {
    e.target.click();
  }
});
 
/* ══════════════════════════════════════
   CHART REGISTRY
══════════════════════════════════════ */
const charts = {};
 
function applyChartDefaults() {
  Chart.defaults.color           = '#7A91A8';
  Chart.defaults.borderColor     = '#D1DCE8';
  Chart.defaults.font.family     = "'DM Mono', Consolas, monospace";
  Chart.defaults.font.size       = 11;
  Chart.defaults.plugins.legend.labels.color = '#3D5066';
  Chart.defaults.plugins.tooltip.backgroundColor = '#1A2332';
  Chart.defaults.plugins.tooltip.borderColor     = '#D1DCE8';
  Chart.defaults.plugins.tooltip.borderWidth     = 1;
  Chart.defaults.plugins.tooltip.titleColor      = '#FFFFFF';
  Chart.defaults.plugins.tooltip.bodyColor       = '#CBD5E1';
  Chart.defaults.plugins.tooltip.padding         = 10;
}
 
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}
 
function buildLineChart(key, canvasId, label, labels, data, color) {
  destroyChart(key);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  charts[key] = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label,
        data,
        borderColor: color,
        backgroundColor: color + '22',
        borderWidth: 2.5,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8,
        tension: 0.35,
        fill: true
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 500, easing: 'easeOutQuart' },
      scales: {
        x: { grid: { color: '#E8EEF4' }, ticks: { color: '#7A91A8', font: { size: 10 } } },
        y: { grid: { color: '#E8EEF4' }, ticks: { color: '#7A91A8', font: { size: 10 } } }
      },
      plugins: { legend: { labels: { color: '#3D5066', boxWidth: 14, font: { size: 12 } } } }
    }
  });
}
 
/* ══════════════════════════════════════
   RESULT / ERROR HELPERS
══════════════════════════════════════ */
function showResult(boxId, items) {
  const box = document.getElementById(boxId);
  if (!box) return;
  const gridHtml = items.map(i => `
    <div class="result-item">
      <span class="r-label">${i.label}</span>
      <span class="r-value">${i.value}</span>
      <span class="r-unit">${i.unit}</span>
    </div>`).join('');
  box.innerHTML = `<h3>Analysis Results</h3><div class="result-grid">${gridHtml}</div>`;
  box.classList.add('visible');
}
 
function showError(boxId, msg) {
  const box = document.getElementById(boxId);
  if (!box) return;
  box.innerHTML = `<p class="err-msg">${msg}</p>`;
  box.classList.add('visible');
}
 
function allNums(...vals) {
  return vals.every(v => v !== '' && v !== null && !isNaN(v) && isFinite(v));
}
 
function ts() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
 
/* ══════════════════════════════════════
   CARNOT CYCLE
══════════════════════════════════════ */
function calculateCarnot() {
  const TH = parseFloat(document.getElementById('highTemp').value);
  const TL = parseFloat(document.getElementById('lowTemp').value);
  const QH = parseFloat(document.getElementById('heatInput').value);
 
  if (!allNums(TH, TL, QH) || TH <= 0 || TL <= 0 || TL >= TH || QH <= 0) {
    showError('carnotResult', 'Enter valid values: TH > TL > 0 and QH > 0');
    return;
  }
 
  const eta     = 1 - TL / TH;
  const work    = eta * QH;
  const heatRej = QH - work;
  const COP     = TL / (TH - TL);
 
  showResult('carnotResult', [
    { label: 'Thermal Efficiency', value: (eta * 100).toFixed(2), unit: '%' },
    { label: 'Net Work Output',    value: work.toFixed(2),         unit: 'kJ' },
    { label: 'Heat Rejected Q_L',  value: heatRej.toFixed(2),      unit: 'kJ' },
    { label: 'COP (Refrigerator)', value: COP.toFixed(3),          unit: '—' }
  ]);
 
  // Carnot T-S rectangle: S changes = QH/TH and QL/TL (should be equal for Carnot)
  const deltaS = QH / TH;
  const S1 = 0, S2 = deltaS, S3 = deltaS, S4 = 0;
  buildLineChart('carnot', 'carnotChart', 'T-S Diagram (Carnot)',
    [`S=${S1.toFixed(3)}`, `S=${S2.toFixed(3)}`, `S=${S3.toFixed(3)}`, `S=${S4.toFixed(3)}`, `S=${S1.toFixed(3)}`],
    [TH, TH, TL, TL, TH], '#1B5FBF'
  );
 
  historyLog.unshift(`[${ts()}] Carnot — TH=${TH}K  TL=${TL}K  η=${(eta*100).toFixed(1)}%  W=${work.toFixed(1)} kJ`);
}
 
function saveCarnot() {
  const TH      = document.getElementById('highTemp').value;
  const TL      = document.getElementById('lowTemp').value;
  const resBox  = document.getElementById('carnotResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!TH || !TL || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Carnot Cycle', { TH, TL }, resBox.innerText);
}
 
function saveOtto() {
  const r      = document.getElementById('compressionRatio').value;
  const gamma  = document.getElementById('gamma').value;
  const resBox = document.getElementById('ottoResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!r || !gamma || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Otto Cycle', { compressionRatio: r, gamma }, resBox.innerText);
}
 
function saveDiesel() {
  const r      = document.getElementById('dieselCompression').value;
  const rc     = document.getElementById('cutoffRatio').value;
  const gamma  = document.getElementById('dieselGamma').value;
  const resBox = document.getElementById('dieselResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!r || !rc || !gamma || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Diesel Cycle', { compressionRatio: r, cutoffRatio: rc, gamma }, resBox.innerText);
}
 
function saveRankine() {
  const Pb     = document.getElementById('boilerPressure').value;
  const Pc     = document.getElementById('condenserPressure').value;
  const etaT   = document.getElementById('turbineEfficiency').value;
  const resBox = document.getElementById('rankineResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!Pb || !Pc || !etaT || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Rankine Cycle', { boilerPressure: Pb, condenserPressure: Pc, turbineEfficiency: etaT }, resBox.innerText);
}
 
function saveBrayton() {
  const rp     = document.getElementById('pressureRatio').value;
  const gamma  = document.getElementById('braytonGamma').value;
  const T1     = document.getElementById('braytonT1').value;
  const resBox = document.getElementById('braytonResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!rp || !gamma || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Brayton Cycle', { pressureRatio: rp, gamma, inletTemp: T1 || 300 }, resBox.innerText);
}
 
function saveRefrigeration() {
  const QL     = document.getElementById('refrigerationEffect').value;
  const W      = document.getElementById('compressorWork').value;
  const resBox = document.getElementById('refrigerationResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!QL || !W || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Refrigeration Cycle', { refrigerationEffect: QL, compressorWork: W }, resBox.innerText);
}
 
function saveHeatExchanger() {
  const m      = document.getElementById('massFlowRate').value;
  const cp     = document.getElementById('specificHeat').value;
  const Tin    = document.getElementById('tempIn').value;
  const Tout   = document.getElementById('tempOut').value;
  const resBox = document.getElementById('heatResult');
  const hasResult = resBox.classList.contains('visible') &&
                    resBox.innerHTML.includes('Analysis Results');
  if (!m || !cp || !Tin || !Tout || !hasResult) {
    alert('Please run a calculation first before saving.');
    return;
  }
  saveSimulation('Heat Exchanger', { massFlowRate: m, specificHeat: cp, tempIn: Tin, tempOut: Tout }, resBox.innerText);
}
 
/* ══════════════════════════════════════
   OTTO CYCLE
══════════════════════════════════════ */
function calculateOtto() {
  const r     = parseFloat(document.getElementById('compressionRatio').value);
  const gamma = parseFloat(document.getElementById('gamma').value);
 
  if (!allNums(r, gamma) || r <= 1 || gamma <= 1) {
    showError('ottoResult', 'Compression ratio > 1 and γ > 1 required');
    return;
  }
 
  const eta = (1 - 1 / Math.pow(r, gamma - 1)) * 100;
  const mep = eta / r;
 
  showResult('ottoResult', [
    { label: 'Thermal Efficiency',  value: eta.toFixed(2),   unit: '%'       },
    { label: 'Compression Ratio',   value: r.toFixed(1),      unit: 'r'       },
    { label: 'Specific Heat Ratio', value: gamma.toFixed(2),  unit: 'γ'       },
    { label: 'Rel. MEP Index',      value: mep.toFixed(3),    unit: 'kPa/kPa' }
  ]);
 
  const pts = pvOtto(r, gamma);
  buildLineChart('otto', 'ottoChart', 'Otto P-V Diagram',
    pts.map(p => `v=${p.v.toFixed(2)}`),
    pts.map(p => parseFloat(p.P.toFixed(4))),
    '#C25A0F'
  );
 
  historyLog.unshift(`[${ts()}] Otto — r=${r}  γ=${gamma}  η=${eta.toFixed(1)}%`);
}
 
function pvOtto(r, gamma) {
  const pts = [];
  const steps = 20;
  // 1→2 adiabatic compression (v: r → 1)
  for (let i = 0; i <= steps; i++) {
    const v = r - (r - 1) * i / steps;
    pts.push({ v, P: Math.pow(r / v, gamma) });
  }
  // 2→3 constant-volume heat addition
  const P2 = Math.pow(r, gamma);
  for (let i = 1; i <= 10; i++) pts.push({ v: 1, P: P2 + P2 * i / 10 });
  // 3→4 adiabatic expansion (v: 1 → r)
  const P3 = P2 * 2;
  for (let i = 1; i <= steps; i++) {
    const v = 1 + (r - 1) * i / steps;
    pts.push({ v, P: P3 / Math.pow(v, gamma) });
  }
  // 4→1 constant-volume heat rejection
  const P4 = P3 / Math.pow(r, gamma);
  for (let i = 1; i <= 10; i++) pts.push({ v: r, P: P4 - (P4 - 1) * i / 10 });
  return pts;
}
 
/* ══════════════════════════════════════
   DIESEL CYCLE
══════════════════════════════════════ */
function calculateDiesel() {
  const r     = parseFloat(document.getElementById('dieselCompression').value);
  const rc    = parseFloat(document.getElementById('cutoffRatio').value);
  const gamma = parseFloat(document.getElementById('dieselGamma').value);
 
  if (!allNums(r, rc, gamma) || r <= 1 || rc <= 1 || rc >= r || gamma <= 1) {
    showError('dieselResult', 'Check: r > rc > 1 and γ > 1');
    return;
  }
 
  const eta     = (1 - (1 / Math.pow(r, gamma - 1)) * ((Math.pow(rc, gamma) - 1) / (gamma * (rc - 1)))) * 100;
  const ottoEta = (1 - 1 / Math.pow(r, gamma - 1)) * 100;
  const P2      = Math.pow(r, gamma);
 
  showResult('dieselResult', [
    { label: 'Diesel Efficiency', value: eta.toFixed(2),     unit: '%'  },
    { label: 'Otto (same r)',      value: ottoEta.toFixed(2), unit: '%'  },
    { label: 'Compression Ratio', value: r.toFixed(1),        unit: 'r'  },
    { label: 'Cutoff Ratio',      value: rc.toFixed(2),       unit: 'rc' }
  ]);
 
  // State 4 pressure: adiabatic expansion from State 3 (v=rc) to State 4 (v=r)
  const P3diesel = P2 * rc; // constant-pressure combustion: P3 = P2, but volume expands to rc
  // Correct P4: P3 * (rc/r)^gamma
  const P4diesel = parseFloat((P2 * Math.pow(rc / r, gamma)).toFixed(4));
  buildLineChart('diesel', 'dieselChart', 'Diesel P-V Diagram',
    ['State 1 (BDC)', 'State 2 (TDC)', 'State 3 (End combustion)', 'State 4 (BDC)', 'State 1'],
    [1, P2, P2, P4diesel, 1],
    '#0F8A6A'
  );
 
  historyLog.unshift(`[${ts()}] Diesel — r=${r}  rc=${rc}  η=${eta.toFixed(1)}%`);
}
 
/* ══════════════════════════════════════
   RANKINE CYCLE
══════════════════════════════════════ */
function calculateRankine() {
  const Pb   = parseFloat(document.getElementById('boilerPressure').value);
  const Pc   = parseFloat(document.getElementById('condenserPressure').value);
  const etaT = parseFloat(document.getElementById('turbineEfficiency').value);
 
  if (!allNums(Pb, Pc, etaT) || Pb <= Pc || Pc <= 0 || etaT <= 0 || etaT > 100) {
    showError('rankineResult', 'Check: boiler > condenser pressure, turbine eff 1–100%');
    return;
  }
 
  const pr       = Pb / Pc;
  const idealEff = 1 - 1 / Math.pow(pr, 0.25);
  const actEff   = idealEff * (etaT / 100) * 100;
  const netWork  = actEff * 0.5 * (Pb - Pc);
  const heatIn   = netWork / (actEff / 100);
 
  showResult('rankineResult', [
    { label: 'Thermal Efficiency',  value: actEff.toFixed(2),  unit: '%'  },
    { label: 'Net Work (approx)',   value: netWork.toFixed(1),  unit: 'kW' },
    { label: 'Heat Input (approx)', value: heatIn.toFixed(1),   unit: 'kW' },
    { label: 'Turbine Efficiency',  value: etaT.toFixed(1),     unit: '%'  }
  ]);
 
  // Rankine T-S diagram: use pressure-based temperature approximations
  // T_sat approx: 100 * P^0.25 (rough steam table correlation in °C, convert to K)
  const TcondK = 273 + Math.max(40, 34 * Math.pow(Pc, 0.25));  // condenser sat temp (K)
  const TboilK = 273 + Math.min(374, 100 * Math.pow(Pb, 0.25)); // boiler sat temp (K)
  buildLineChart('rankine', 'rankineChart', 'Rankine T-S Diagram',
    ['1 Pump Out', '2 Boiler In', '3 Steam Out', '4 Condenser In', '1'],
    [
      parseFloat(TcondK.toFixed(1)),
      parseFloat(TboilK.toFixed(1)),
      parseFloat((TboilK + 20).toFixed(1)),
      parseFloat((TcondK + 5).toFixed(1)),
      parseFloat(TcondK.toFixed(1))
    ],
    '#7C3AED'
  );
 
  historyLog.unshift(`[${ts()}] Rankine — Pb=${Pb} bar  η=${actEff.toFixed(1)}%`);
}
 
/* ══════════════════════════════════════
   BRAYTON CYCLE  (FIXED — no recursion)
══════════════════════════════════════ */
function calculateBrayton() {
  const rp    = parseFloat(document.getElementById('pressureRatio').value);
  const gamma = parseFloat(document.getElementById('braytonGamma').value);
  const T1    = parseFloat(document.getElementById('braytonT1').value) || 300;
 
  if (!allNums(rp, gamma) || rp <= 1 || gamma <= 1) {
    showError('braytonResult', 'Pressure ratio > 1 and γ > 1 required');
    return;
  }
 
  const eta = (1 - 1 / Math.pow(rp, (gamma - 1) / gamma)) * 100;
  const T2  = T1 * Math.pow(rp, (gamma - 1) / gamma);
  const T3  = T2 + 400; // assume constant heat addition
  const T4  = T3 / Math.pow(rp, (gamma - 1) / gamma);
 
  showResult('braytonResult', [
    { label: 'Thermal Efficiency', value: eta.toFixed(2),         unit: '%' },
    { label: 'Pressure Ratio',     value: rp.toFixed(1),           unit: 'rp' },
    { label: 'T2 (Compressor out)',value: T2.toFixed(1),            unit: 'K' },
    { label: 'T4 (Turbine out)',   value: T4.toFixed(1),            unit: 'K' }
  ]);
 
  buildLineChart('brayton', 'braytonChart', 'Brayton T-S Diagram',
    ['1 Compressor In', '2 Compressor Out', '3 Combustor Out', '4 Turbine Out', '1'],
    [T1, T2, T3, T4, T1],
    '#D97706'
  );
 
  historyLog.unshift(`[${ts()}] Brayton — rp=${rp}  γ=${gamma}  η=${eta.toFixed(1)}%`);
}
 
/* ══════════════════════════════════════
   REFRIGERATION COP
══════════════════════════════════════ */
function calculateCOP() {
  const QL = parseFloat(document.getElementById('refrigerationEffect').value);
  const W  = parseFloat(document.getElementById('compressorWork').value);
 
  if (!allNums(QL, W) || QL <= 0 || W <= 0) {
    showError('refrigerationResult', 'Both QL and W must be positive numbers');
    return;
  }
 
  const COP        = QL / W;
  const heatRej    = QL + W;
  const COPHP      = heatRej / W;
  const efficiency = (COP / (COP + 1)) * 100;
 
  showResult('refrigerationResult', [
    { label: 'COP (Refrigerator)', value: COP.toFixed(3),         unit: '—'  },
    { label: 'COP (Heat Pump)',    value: COPHP.toFixed(3),        unit: '—'  },
    { label: 'Heat Rejected Q_H', value: heatRej.toFixed(2),       unit: 'kJ' },
    { label: 'Carnot COP (ref)',  value: efficiency.toFixed(1),    unit: '%'  }
  ]);
 
  // Enthalpy-based P-h approximation: h1=QL reference, h2=h1+W, h3=h2-QH, h4=h3 (throttle)
  const h1 = 200;
  const h2 = h1 + W;
  const h3 = h2 - heatRej;
  const h4 = h3;
  buildLineChart('refrigeration', 'refrigerationChart', 'VCR Cycle (P-h)',
    ['1 Evaporator Out', '2 Compressor Out', '3 Condenser Out', '4 Exp. Valve Out', '1'],
    [parseFloat(h1.toFixed(2)), parseFloat(h2.toFixed(2)), parseFloat(h3.toFixed(2)), parseFloat(h4.toFixed(2)), parseFloat(h1.toFixed(2))],
    '#0891B2'
  );
 
  historyLog.unshift(`[${ts()}] Refrigeration — COP=${COP.toFixed(2)}  QH=${heatRej.toFixed(1)} kJ`);
}
 
/* ══════════════════════════════════════
   HEAT EXCHANGER
══════════════════════════════════════ */
function calculateHeatExchanger() {
  const m    = parseFloat(document.getElementById('massFlowRate').value);
  const cp   = parseFloat(document.getElementById('specificHeat').value);
  const Tin  = parseFloat(document.getElementById('tempIn').value);
  const Tout = parseFloat(document.getElementById('tempOut').value);
 
  if (!allNums(m, cp, Tin, Tout) || m <= 0 || cp <= 0) {
    showError('heatResult', 'All values required; m and cp must be positive');
    return;
  }
  if (Tin === Tout) {
    showError('heatResult', 'Inlet and outlet temperatures must differ');
    return;
  }
 
  const dT   = Tout - Tin;
  const Q    = m * cp * dT;
  const LMTD = Math.abs(dT);
  const NTU  = LMTD / 10;
 
  showResult('heatResult', [
    { label: 'Temp Difference',    value: dT.toFixed(2),      unit: '°C' },
    { label: 'Heat Transfer Rate', value: Q.toFixed(2),        unit: 'kW' },
    { label: 'LMTD (approx)',      value: LMTD.toFixed(2),    unit: '°C' },
    { label: 'NTU (approx)',       value: NTU.toFixed(3),      unit: '—'  }
  ]);
 
  const steps  = 10;
  const labels = Array.from({ length: steps + 1 }, (_, i) => `${i * 10}%`);
  const temps  = Array.from({ length: steps + 1 }, (_, i) => Tin + dT * (i / steps));
  buildLineChart('heat', 'heatChart', 'Temperature Profile', labels, temps, '#0369A1');
 
  historyLog.unshift(`[${ts()}] HEX — Q=${Q.toFixed(1)} kW  ΔT=${dT.toFixed(1)} °C`);
}
 
/* ══════════════════════════════════════
   COMPARISON DASHBOARD
══════════════════════════════════════ */
function showComparison() {
  const cE = extractEff('Carnot',      70);
  const oE = extractEff('Otto',        56);
  const dE = extractEff('Diesel',      62);
  const rE = extractEff('Rankine',     38);
  const bE = extractEff('Brayton',     45);
 
  // Detect if we are using fallback defaults (no real simulations run yet)
  const usingDefaults = historyLog.length === 0 ||
    !['Carnot','Otto','Diesel','Rankine','Brayton'].some(k => historyLog.some(l => l.includes(k)));
  const defaultNotice = usingDefaults
    ? `<p class="hint-text" style="color:var(--accent-hot);margin-bottom:12px">⚠ Showing reference defaults — run individual cycles first for computed values.</p>`
    : `<p class="hint-text" style="color:var(--accent-2);margin-bottom:12px">✓ Using your computed simulation results.</p>`;
 
  const vals   = [cE, oE, dE, rE, bE];
  const names  = ['Carnot', 'Otto', 'Diesel', 'Rankine', 'Brayton'];
  const colors = ['#1B5FBF', '#C25A0F', '#0F8A6A', '#7C3AED', '#D97706'];
  const best   = Math.max(...vals);
  const bestName = names[vals.indexOf(best)];
 
  const box = document.getElementById('comparisonResult');
  box.innerHTML = `
    <h3>Cycle Comparison</h3>
    ${defaultNotice}
    <div class="comparison-row">
      ${names.map((n, i) => `
        <div class="cmp-stat">
          <span class="cmp-label">${n}</span>
          <span class="cmp-val" style="color:${colors[i]}">${vals[i].toFixed(1)}%</span>
        </div>`).join('')}
    </div>
    <p style="font-size:12.5px;color:var(--text-dim);margin-top:14px;text-align:center">
      Highest: <strong style="color:var(--accent-2)">${bestName} Cycle</strong> at ${best.toFixed(1)}%
    </p>`;
  box.classList.add('visible');
 
  destroyChart('comparison');
  const ctx = document.getElementById('comparisonChart');
  if (!ctx) return;
 
  charts['comparison'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [{
        label: 'Thermal Efficiency (%)',
        data: vals,
        backgroundColor: colors.map(c => c + 'CC'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      animation: { duration: 700, easing: 'easeOutCubic' },
      scales: {
        x: { grid: { color: '#E8EEF4' }, ticks: { color: '#3D5066' } },
        y: {
          beginAtZero: true, max: 100,
          grid: { color: '#E8EEF4' },
          ticks: { color: '#3D5066', callback: v => v + '%' }
        }
      },
      plugins: {
        legend: { labels: { color: '#3D5066' } },
        tooltip: { callbacks: { label: c => ` ${c.raw.toFixed(1)}%` } }
      }
    }
  });
}
 
function extractEff(key, fallback) {
  const entry = historyLog.find(l => l.includes(key));
  if (!entry) return fallback;
  const m = entry.match(/η=([\d.]+)%/);
  return m ? parseFloat(m[1]) : fallback;
}
 
/* ══════════════════════════════════════
   THERMAL PROPERTY DATABASE
══════════════════════════════════════ */
const thermalDatabase = [
  { name: 'Air',          density: '1.225 kg/m³', cp: '1.005 kJ/kg·K', conductivity: '0.026 W/m·K', viscosity: '1.81 ×10⁻⁵ Pa·s' },
  { name: 'Water',        density: '1000 kg/m³',  cp: '4.18 kJ/kg·K',  conductivity: '0.60 W/m·K',  viscosity: '0.001 Pa·s'        },
  { name: 'Steam',        density: '0.60 kg/m³',  cp: '2.08 kJ/kg·K',  conductivity: '0.025 W/m·K', viscosity: '1.30 ×10⁻⁵ Pa·s'  },
  { name: 'Engine Oil',   density: '870 kg/m³',   cp: '2.1 kJ/kg·K',   conductivity: '0.145 W/m·K', viscosity: '0.25 Pa·s'         },
  { name: 'R134a',        density: '1207 kg/m³',  cp: '1.42 kJ/kg·K',  conductivity: '0.083 W/m·K', viscosity: '2.0×10⁻⁴ Pa·s'    },
  { name: 'Ethanol',      density: '789 kg/m³',   cp: '2.44 kJ/kg·K',  conductivity: '0.167 W/m·K', viscosity: '1.2×10⁻³ Pa·s'    },
  { name: 'Hydrogen',     density: '0.089 kg/m³', cp: '14.3 kJ/kg·K',  conductivity: '0.180 W/m·K', viscosity: '8.9×10⁻⁶ Pa·s'    },
  { name: 'Mercury',      density: '13600 kg/m³', cp: '0.14 kJ/kg·K',  conductivity: '8.34 W/m·K',  viscosity: '1.5×10⁻³ Pa·s'    },
  { name: 'Nitrogen',     density: '1.165 kg/m³', cp: '1.04 kJ/kg·K',  conductivity: '0.026 W/m·K', viscosity: '1.76×10⁻⁵ Pa·s'   },
  { name: 'Carbon Dioxide', density: '1.842 kg/m³', cp: '0.846 kJ/kg·K', conductivity: '0.017 W/m·K', viscosity: '1.48×10⁻⁵ Pa·s' }
];
 
function searchProperty() {
  const q = (document.getElementById('propertySearch').value || '').toLowerCase();
  const results = thermalDatabase.filter(item => item.name.toLowerCase().includes(q));
  const container = document.getElementById('propertyResults');
  if (results.length === 0) {
    container.innerHTML = `<p class="hint-text" style="padding:20px 0">No results found for "${q}"</p>`;
    return;
  }
  container.innerHTML = results.map(item => `
    <div class="property-card">
      <h3>${item.name}</h3>
      <div class="prop-row"><span class="prop-key">Density</span><span class="prop-val">${item.density}</span></div>
      <div class="prop-row"><span class="prop-key">Cp</span><span class="prop-val">${item.cp}</span></div>
      <div class="prop-row"><span class="prop-key">Conductivity</span><span class="prop-val">${item.conductivity}</span></div>
      <div class="prop-row"><span class="prop-key">Viscosity</span><span class="prop-val">${item.viscosity}</span></div>
    </div>`).join('');
}
 
/* ══════════════════════════════════════
   STEAM PROPERTIES
══════════════════════════════════════ */
const steamTable = [
  { pressure: 1,   temperature: 99.6,  enthalpy: 2676, entropy: 7.359, specificVolume: 1.6940 },
  { pressure: 5,   temperature: 151.8, enthalpy: 2748, entropy: 6.822, specificVolume: 0.3749 },
  { pressure: 10,  temperature: 179.9, enthalpy: 2778, entropy: 6.586, specificVolume: 0.1944 },
  { pressure: 20,  temperature: 212.4, enthalpy: 2799, entropy: 6.340, specificVolume: 0.0996 },
  { pressure: 40,  temperature: 250.3, enthalpy: 2801, entropy: 6.070, specificVolume: 0.0498 },
  { pressure: 60,  temperature: 275.6, enthalpy: 2785, entropy: 5.891, specificVolume: 0.0324 },
  { pressure: 80,  temperature: 295.0, enthalpy: 2758, entropy: 5.745, specificVolume: 0.0235 },
  { pressure: 100, temperature: 311.0, enthalpy: 2724, entropy: 5.615, specificVolume: 0.0180 }
];
 
function populateSteamTable() {
  const tbody = document.getElementById('steamTableBody');
  if (!tbody) return;
  tbody.innerHTML = steamTable.map(s => `
    <tr>
      <td>${s.pressure}</td>
      <td>${s.temperature}</td>
      <td>${s.enthalpy}</td>
      <td>${s.entropy}</td>
    </tr>`).join('');
}
 
function lookupSteamProperties() {
  const p = parseFloat(document.getElementById('steamPressure').value);
  if (isNaN(p) || p <= 0) {
    showError('steamResults', 'Enter a valid positive pressure value');
    return;
  }
 
  // Find closest match
  let result = steamTable.find(item => item.pressure === p);
  if (!result) {
    const sorted = [...steamTable].sort((a, b) => Math.abs(a.pressure - p) - Math.abs(b.pressure - p));
    result = sorted[0];
    const box = document.getElementById('steamResults');
    box.innerHTML = `<p class="hint-text" style="margin-bottom:12px">Exact match not found. Showing closest entry (${result.pressure} bar).</p>`;
    box.classList.add('visible');
  }
 
  showResult('steamResults', [
    { label: 'Pressure',           value: result.pressure,       unit: 'bar'    },
    { label: 'Saturation Temp',    value: result.temperature,    unit: '°C'     },
    { label: 'Enthalpy h_g',       value: result.enthalpy,       unit: 'kJ/kg'  },
    { label: 'Entropy s_g',        value: result.entropy,        unit: 'kJ/kg·K'},
    { label: 'Specific Volume',    value: result.specificVolume, unit: 'm³/kg'  }
  ]);
}
 
/* ══════════════════════════════════════
   ADVANCED ANALYSIS
══════════════════════════════════════ */
function analyzeCycles() {
  const usingDefaults = historyLog.length === 0 ||
    !['Carnot','Otto','Diesel','Rankine','Brayton'].some(k => historyLog.some(l => l.includes(k)));
  const defaultNotice = usingDefaults
    ? `<p class="hint-text" style="color:var(--accent-hot);margin-bottom:10px">⚠ Reference values shown — run individual cycles first for your computed ranking.</p>`
    : `<p class="hint-text" style="color:var(--accent-2);margin-bottom:10px">✓ Ranked from your simulation results.</p>`;
 
  const cycles = [
    { name: 'Carnot',         efficiency: extractEff('Carnot', 70)         },
    { name: 'Diesel',         efficiency: extractEff('Diesel', 62)         },
    { name: 'Otto',           efficiency: extractEff('Otto',   56)         },
    { name: 'Brayton',        efficiency: extractEff('Brayton',45)         },
    { name: 'Rankine',        efficiency: extractEff('Rankine',38)         },
    { name: 'Refrigeration',  efficiency: 0, cop: true                     }
  ].filter(c => !c.cop).sort((a, b) => b.efficiency - a.efficiency);
 
  const medals = ['🥇', '🥈', '🥉'];
  const output = `
    <h3>Cycle Ranking</h3>
    ${defaultNotice}
    ${cycles.map((c, i) => `
      <div class="rank-row">
        <span class="rank-medal">${medals[i] || (i + 1) + '.'}</span>
        <span class="rank-name">${c.name}</span>
        <div class="rank-bar-wrap"><div class="rank-bar" style="width:${c.efficiency}%"></div></div>
        <span class="rank-val">${c.efficiency.toFixed(1)}%</span>
      </div>`).join('')}`;
 
  const box = document.getElementById('analysisOutput');
  box.innerHTML = output;
  box.classList.add('visible');
 
  destroyChart('analysis');
  const ctx = document.getElementById('analysisChart');
  if (!ctx) return;
 
  charts['analysis'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: cycles.map(c => c.name),
      datasets: [{
        label: 'Thermal Efficiency (%)',
        data: cycles.map(c => c.efficiency),
        backgroundColor: ['#1B5FBF','#0F8A6A','#C25A0F','#D97706','#7C3AED'].map(c => c + 'CC'),
        borderColor:     ['#1B5FBF','#0F8A6A','#C25A0F','#D97706','#7C3AED'],
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      scales: {
        x: { grid: { color: '#E8EEF4' }, ticks: { color: '#3D5066' } },
        y: { beginAtZero: true, max: 100, ticks: { callback: v => v + '%', color: '#3D5066' } }
      },
      plugins: { legend: { labels: { color: '#3D5066' } } }
    }
  });
}
 
/* ══════════════════════════════════════
   FORMULA LIBRARY
══════════════════════════════════════ */
const formulaLibrary = [
  // Thermodynamics
  { category: 'Thermodynamics', name: 'Carnot Efficiency',          formula: 'η = 1 − TL/TH',                             description: 'Maximum theoretical thermal efficiency between two temperatures.' },
  { category: 'Thermodynamics', name: 'Otto Cycle Efficiency',      formula: 'η = 1 − 1/r^(γ−1)',                         description: 'Ideal SI engine efficiency based on compression ratio.' },
  { category: 'Thermodynamics', name: 'Diesel Cycle Efficiency',    formula: 'η = 1 − (1/r^(γ−1)) × (rc^γ−1)/(γ(rc−1))', description: 'Ideal CI engine efficiency with cutoff ratio.' },
  { category: 'Thermodynamics', name: 'Brayton Efficiency',         formula: 'η = 1 − 1/rp^((γ−1)/γ)',                   description: 'Gas turbine ideal cycle efficiency.' },
  { category: 'Thermodynamics', name: 'Rankine Efficiency',         formula: 'η = W_net / Q_in',                          description: 'Steam power cycle thermal efficiency.' },
  { category: 'Thermodynamics', name: 'First Law (Closed System)',  formula: 'ΔQ = ΔU + ΔW',                              description: 'Energy balance for a closed thermodynamic system.' },
  { category: 'Thermodynamics', name: 'Entropy Change',             formula: 'ΔS = Q/T',                                  description: 'Entropy transfer during a reversible isothermal process.' },
  { category: 'Thermodynamics', name: 'Ideal Gas Equation',         formula: 'PV = nRT',                                  description: 'Relationship between pressure, volume, moles, and temperature.' },
  { category: 'Thermodynamics', name: 'Specific Work (Boundary)',   formula: 'W = P(V₂ − V₁)',                            description: 'Boundary work at constant pressure.' },
  { category: 'Thermodynamics', name: 'Exergy',                     formula: 'Ex = (H−H₀) − T₀(S−S₀)',                   description: 'Maximum useful work obtainable from a system.' },
  { category: 'Thermodynamics', name: 'Isentropic Efficiency',      formula: 'η = Actual Work / Isentropic Work',         description: 'Measures turbine or compressor performance vs ideal.' },
  // Heat Transfer
  { category: 'Heat Transfer', name: 'Heat Transfer Rate',          formula: 'Q = ṁCpΔT',                                 description: 'Sensible heat in fluid flow.' },
  { category: 'Heat Transfer', name: 'Fourier\'s Law',              formula: 'q = −k·A·(dT/dx)',                          description: 'Conduction heat transfer through a material.' },
  { category: 'Heat Transfer', name: 'Newton\'s Law of Cooling',    formula: 'Q = h·A·(Ts − T∞)',                         description: 'Convective heat transfer between surface and fluid.' },
  { category: 'Heat Transfer', name: 'Stefan-Boltzmann Law',        formula: 'Q = ε·σ·A·T⁴',                             description: 'Radiative heat transfer from a body.' },
  { category: 'Heat Transfer', name: 'LMTD',                        formula: 'LMTD = (ΔT₁−ΔT₂)/ln(ΔT₁/ΔT₂)',            description: 'Log Mean Temperature Difference for heat exchangers.' },
  { category: 'Heat Transfer', name: 'Overall Heat Transfer',       formula: 'Q = U·A·ΔT',                               description: 'Overall heat exchanger equation.' },
  { category: 'Heat Transfer', name: 'Thermal Resistance',          formula: 'R = L/(k·A)',                               description: 'Resistance to heat conduction through a wall.' },
  { category: 'Heat Transfer', name: 'Biot Number',                 formula: 'Bi = h·L/k',                               description: 'Ratio of convection to conduction resistance.' },
  { category: 'Heat Transfer', name: 'Nusselt Number',              formula: 'Nu = h·L/k',                               description: 'Dimensionless convective heat transfer coefficient.' },
  { category: 'Heat Transfer', name: 'Prandtl Number',              formula: 'Pr = ν/α',                                  description: 'Ratio of momentum to thermal diffusivity.' },
  // Refrigeration
  { category: 'Refrigeration', name: 'COP (Refrigerator)',          formula: 'COP = QL / W',                              description: 'Coefficient of performance of a refrigeration cycle.' },
  { category: 'Refrigeration', name: 'COP (Heat Pump)',             formula: 'COP_HP = QH / W',                           description: 'Coefficient of performance of a heat pump.' },
  { category: 'Refrigeration', name: 'Refrigeration Effect',        formula: 'RE = h₁ − h₄',                             description: 'Cooling effect produced by the refrigerant.' },
  { category: 'Refrigeration', name: 'Compressor Work',             formula: 'W = h₂ − h₁',                              description: 'Work required by the compressor.' },
  { category: 'Refrigeration', name: 'Heat Rejection',              formula: 'QH = h₂ − h₃',                             description: 'Heat rejected in the condenser.' },
  { category: 'Refrigeration', name: 'Ton of Refrigeration',        formula: '1 TR = 3.517 kW',                          description: 'Standard unit of refrigeration capacity.' },
  // Power Plant
  { category: 'Power Plant', name: 'Boiler Efficiency',             formula: 'η = Heat Output / Heat Input',              description: 'Thermal efficiency of a boiler.' },
  { category: 'Power Plant', name: 'Turbine Efficiency',            formula: 'η = Actual Work / Isentropic Work',         description: 'Steam turbine isentropic performance.' },
  { category: 'Power Plant', name: 'Specific Steam Consumption',    formula: 'SSC = ṁ_steam / Power Output',              description: 'Steam mass flow per unit power generated.' },
  { category: 'Power Plant', name: 'Heat Rate',                     formula: 'HR = Q_in / P_out',                         description: 'Heat input per unit of electrical power output.' },
  { category: 'Power Plant', name: 'Turbine Work',                  formula: 'W_t = h₁ − h₂',                            description: 'Work produced by the steam turbine.' },
  { category: 'Power Plant', name: 'Pump Work',                     formula: 'W_p = h₂ − h₁',                            description: 'Work consumed by the feed pump.' },
  { category: 'Power Plant', name: 'Net Cycle Work',                formula: 'W_net = W_t − W_p',                         description: 'Net work output of the Rankine cycle.' }
];
 
function searchFormula() {
  const q = (document.getElementById('formulaSearch').value || '').toLowerCase();
  const filtered = formulaLibrary.filter(item =>
    item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
  );
  const container = document.getElementById('formulaResults');
  if (filtered.length === 0) {
    container.innerHTML = `<p class="hint-text" style="padding:20px">No formulas match "${q}"</p>`;
    return;
  }
  // Group by category
  const groups = {};
  filtered.forEach(f => { if (!groups[f.category]) groups[f.category] = []; groups[f.category].push(f); });
 
  container.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="formula-group">
      <h3 class="formula-cat">${cat}</h3>
      <div class="formula-cards">
        ${items.map(item => `
          <div class="formula-card">
            <div class="formula-name">${item.name}</div>
            <div class="formula-eq">${item.formula}</div>
            <div class="formula-desc">${item.description}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}
 
/* ══════════════════════════════════════
   SAVE / LOAD SIMULATIONS
══════════════════════════════════════ */
function saveSimulation(module, inputs, results) {
  const sim = { date: new Date().toLocaleString(), module, inputs, results };
  savedSimulations.push(sim);
  try {
    localStorage.setItem('thermalWorkbenchData', JSON.stringify(savedSimulations));
    showToast('✓ Simulation saved successfully');
  } catch (e) {
    showToast('⚠ Could not save to localStorage');
  }
}
 
function loadSavedSimulations() {
  const container = document.getElementById('savedOutput');
  if (savedSimulations.length === 0) {
    container.innerHTML = '<p class="hint-text" style="margin-top:16px">No saved simulations found.</p>';
    return;
  }
  container.innerHTML = savedSimulations.map((sim, i) => `
    <div class="history-card">
      <div class="hc-header">
        <span class="hc-module">${sim.module}</span>
        <span class="hc-date">${sim.date}</span>
      </div>
      <pre class="hc-inputs">${JSON.stringify(sim.inputs, null, 2)}</pre>
      <pre class="hc-results">${sim.results}</pre>
    </div>`).join('');
}
 
function clearStorage() {
  if (!confirm('Clear all saved simulation history? This cannot be undone.')) return;
  localStorage.removeItem('thermalWorkbenchData');
  savedSimulations = [];
  document.getElementById('savedOutput').innerHTML = '<p class="hint-text" style="margin-top:16px">History cleared.</p>';
  showToast('History cleared');
}
 
/* ══════════════════════════════════════
   REPORT CENTER
══════════════════════════════════════ */
function generateReport() {
  const now = new Date().toLocaleString();
  const lines = historyLog.length > 0
    ? historyLog.slice(0, 10).map(h => '  ' + h).join('\n')
    : '  No simulations run in this session.';
 
  const report = `THERMAL ENGINEERING WORKBENCH — SESSION REPORT
═══════════════════════════════════════════════════
Generated  : ${now}
Developer  : P. Veera Manikanta
 
AVAILABLE MODULES
───────────────────────────────────────────────────
  ✓  Carnot Cycle Simulator
  ✓  Otto Cycle Simulator       (SI Engine)
  ✓  Diesel Cycle Simulator     (CI Engine)
  ✓  Rankine Cycle Simulator    (Steam Plant)
  ✓  Brayton Cycle Simulator    (Gas Turbine)
  ✓  Refrigeration / COP
  ✓  Heat Exchanger Analysis
  ✓  Thermal Property Database
  ✓  Steam Property Lookup
  ✓  Formula Library
  ✓  Cycle Comparison Dashboard
  ✓  Advanced Analysis
  ✓  Simulation History
 
SESSION SUMMARY
───────────────────────────────────────────────────
  Simulations run this session : ${historyLog.length}
 
${historyLog.length > 0 ? 'RECENT CALCULATIONS:\n' + lines : lines}
 
STATUS : OPERATIONAL ✓
═══════════════════════════════════════════════════`;
 
  document.getElementById('reportOutput').innerHTML = `<pre class="report-pre">${report}</pre>`;
}
 
function showHistory() {
  const out = document.getElementById('historyOutput');
  if (historyLog.length === 0) {
    out.innerHTML = `<p class="hint-text" style="margin-top:14px">No simulations recorded yet. Run a calculation first.</p>`;
    return;
  }
  out.innerHTML = `<div class="history-wrap">` +
    historyLog.map(h => `<div class="history-item"><span class="h-dot"></span>${h}</div>`).join('') +
    `</div>`;
}
 
/* ══════════════════════════════════════
   TOAST NOTIFICATION
══════════════════════════════════════ */
function showToast(msg) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('toast-show'));
  setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => toast.remove(), 300); }, 2500);
}
 
/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  applyChartDefaults();
  populateSteamTable();
  searchProperty();   // show all properties on load
  searchFormula();    // show all formulas on load
});