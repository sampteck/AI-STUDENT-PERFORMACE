/* ====================================================
   app.js — final features: demo dataset + filters + exports + suggestions
   - Chart.js for visuals
   - jsPDF + autoTable for professional PDF with charts
   - CSV export for full dataset
   - search/filter + suggestions + toasts
   ==================================================== */

/* ---------- Helpers ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const toast = (msg, type='info') => {
  const c = $('#toastContainer');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(()=> el.remove(), 3000);
};

/* ---------- Demo dataset (diverse students) ---------- */
let students = [
  { id:1, name:"Adewale Okoro", math:92, science:88, english:90 },
  { id:2, name:"Grace Adebayo", math:85, science:79, english:82 },
  { id:3, name:"Musa Ibrahim", math:58, science:61, english:55 },
  { id:4, name:"Chidinma Smith", math:72, science:70, english:75 },
  { id:5, name:"Emeka Johnson", math:44, science:50, english:48 },
  { id:6, name:"Lilian Olu", math:78, science:82, english:80 },
  { id:7, name:"Tunde Adeyemi", math:66, science:60, english:64 },
  { id:8, name:"Fatima Onyek", math:95, science:93, english:96 },
  { id:9, name:"Kemi Madu", math:55, science:58, english:60 },
  { id:10, name:"Ibrahim Daniel", math:70, science:68, english:72 }
];

/* ---------- DOM refs ---------- */
const kpiTotal = $('#kpiTotal'), kpiAvg = $('#kpiAvg'), kpiRisk = $('#kpiRisk');
const performanceChartEl = $('#performanceChart'), subjectChartEl = $('#subjectChart'), trendChartEl = $('#trendChart'), radarChartEl = $('#radarChart');
const studentTableBody = $('#studentTable tbody');
const searchInput = $('#globalSearch'), filterSelect = $('#filterCategory'), rowsPerPage = $('#rowsPerPage');
const genRecsBtn = $('#genRecs'), suggestionsDiv = $('#suggestions');
const exportCSVBtn = $('#exportAllCSV'), exportPDFBtn = $('#exportAllPDF'), darkToggle = $('#darkModeToggle');
const themeOverlay = $('#themeOverlay');

/* ---------- Charts (Chart.js) ---------- */
let performanceChart, subjectChart, trendChart, radarChart;

function calcSubjectAverages(list){
  if (!list || !list.length) return [0,0,0];
  const sum = list.reduce((acc,s)=>{ acc[0]+=s.math; acc[1]+=s.science; acc[2]+=s.english; return acc; }, [0,0,0]);
  return sum.map(v => Math.round((v/list.length)*10)/10);
}

function initCharts(){
  const names = students.map(s=>s.name);
  performanceChart = new Chart(performanceChartEl.getContext('2d'), {
    type:'bar',
    data: { labels:names, datasets:[
      { label:'Math', data:students.map(s=>s.math), backgroundColor:'#0b83b5' },
      { label:'Science', data:students.map(s=>s.science), backgroundColor:'#0ea5a4' },
      { label:'English', data:students.map(s=>s.english), backgroundColor:'#f59e0b' }
    ]},
    options:{ responsive:true, plugins:{legend:{position:'top'}}, scales:{y:{beginAtZero:true, max:100}}}
  });

  subjectChart = new Chart(subjectChartEl.getContext('2d'), {
    type:'doughnut',
    data:{ labels:['Math','Science','English'], datasets:[{ data:calcSubjectAverages(students), backgroundColor:['#0b83b5','#0ea5a4','#f59e0b'] }]},
    options:{ responsive:true, plugins:{legend:{position:'bottom'}}}
  });

  trendChart = new Chart(trendChartEl.getContext('2d'), {
    type:'line',
    data:{ labels:['Week 1','Week 2','Week 3','Week 4'], datasets:[{ label:'Average Score', data:[62,68,73,76], borderColor:'#6610f2', fill:true, backgroundColor:'rgba(102,16,242,0.08)'}]},
    options:{ responsive:true, scales:{y:{beginAtZero:true, max:100}}}
  });

  const first = students[0];
  radarChart = new Chart(radarChartEl.getContext('2d'), {
    type:'radar',
    data:{ labels:['Math','Science','English'], datasets:[{ label:first.name, data:[first.math, first.science, first.english], backgroundColor:'rgba(11,131,181,0.18)', borderColor:'#0b83b5' }]},
    options:{ responsive:true, scales:{r:{beginAtZero:true, max:100}}}
  });
}

function updateCharts(list = students){
  performanceChart.data.labels = list.map(s=>s.name);
  performanceChart.data.datasets[0].data = list.map(s=>s.math);
  performanceChart.data.datasets[1].data = list.map(s=>s.science);
  performanceChart.data.datasets[2].data = list.map(s=>s.english);
  performanceChart.update();

  subjectChart.data.datasets[0].data = calcSubjectAverages(list);
  subjectChart.update();

  // radar show top student or first
  const top = list.length ? list.reduce((a,b)=> ((a.math+a.science+a.english)>(b.math+b.science+b.english)?a:b)) : {name:'N/A', math:0,science:0,english:0};
  radarChart.data.datasets[0].label = top.name;
  radarChart.data.datasets[0].data = [top.math, top.science, top.english];
  radarChart.update();
}

/* ---------- Render table & KPIs ---------- */
function categoryOf(avg){
  if (avg >= 85) return 'excellent';
  if (avg >= 65) return 'average';
  return 'poor';
}

function renderTable(list = students){
  studentTableBody.innerHTML = '';
  list.forEach((s, idx) => {
    const avg = Math.round((s.math + s.science + s.english)/3);
    const cat = categoryOf(avg);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${idx+1}</td><td>${s.name}</td><td>${s.math}</td><td>${s.science}</td><td>${s.english}</td><td>${avg}</td><td>${cat}</td>`;
    studentTableBody.appendChild(tr);
  });

  // KPIs
  $('#kpiTotal').textContent = students.length;
  const avgAll = Math.round(students.reduce((a,b)=> a + (b.math+b.science+b.english)/3,0)/ students.length);
  $('#kpiAvg').textContent = `${avgAll}%`;
  const risk = students.filter(s => ((s.math+s.science+s.english)/3) < 50).length;
  $('#kpiRisk').textContent = risk;
}

/* ---------- Search & Filter ---------- */
function applyFilters(){
  const q = (searchInput.value || '').trim().toLowerCase();
  const cat = (filterSelect.value || 'all');
  let filtered = students.filter(s => s.name.toLowerCase().includes(q));
  if (cat !== 'all'){
    filtered = filtered.filter(s => {
      const avg = Math.round((s.math + s.science + s.english)/3);
      return (cat === 'excellent' && avg >=85) || (cat === 'average' && avg >=65 && avg <85) || (cat === 'poor' && avg <65);
    });
  }
  renderTable(filtered);
  updateCharts(filtered);
}

/* ---------- AI Suggestions ---------- */
function generateSuggestions(){
  suggestionsDiv.innerHTML = '';
  students.forEach(s => {
    const avg = Math.round((s.math + s.science + s.english)/3);
    const tips = [];
    if (s.math < 70) tips.push('Increase daily math practice (30min).');
    if (s.science < 70) tips.push('Do short experiments & revise concepts.');
    if (s.english < 70) tips.push('Read more & practice essay writing.');
    if (avg >= 85) tips.push('Outstanding — consider peer mentorship or competition.');
    if (!tips.length) tips.push('Keep consistent study routine and group studies.');

    const el = document.createElement('div');
    el.className = 'suggestion';
    el.innerHTML = `<strong>${s.name}</strong><p>${tips.join(' ')}</p><small>Avg: ${avg}% — Category: ${categoryOf(avg)}</small>`;
    suggestionsDiv.appendChild(el);
  });
  toast('AI suggestions generated', 'success');
}

/* ---------- CSV Export (professional for full dataset) ---------- */
function exportCSV(){
  const header = 'Name,Math,Science,English,Avg,Category\n';
  const rows = students.map(s => {
    const avg = Math.round((s.math + s.science + s.english)/3);
    return `${s.name},${s.math},${s.science},${s.english},${avg},${categoryOf(avg)}`;
  }).join('\n');
  const blob = new Blob([header+rows], { type:'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'crawford_students_dataset.csv'; a.click(); URL.revokeObjectURL(url);
  toast('CSV exported', 'success');
}

/* ---------- Professional PDF Export (embed charts + table) ---------- */
async function exportPDF(){
  // prepare image data from charts (await next frame to ensure charts are ready)
  const perfImg = performanceChartEl.toDataURL('image/png', 1.0);
  const subjImg = subjectChartEl.toDataURL('image/png', 1.0);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p','pt','a4');

  // Logo / Title
  doc.setFontSize(18);
  doc.text('Crawford University', 40, 50);
  doc.setFontSize(14);
  doc.text('AI Student Performance — Report', 40, 72);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 90);

  // embed performance chart
  doc.addImage(perfImg, 'PNG', 40, 110, 520, 180);
  doc.addPage();

  // embed subject chart
  doc.addImage(subjImg, 'PNG', 40, 40, 260, 180);

  // table using autoTable
  const body = students.map(s => {
    const avg = Math.round((s.math + s.science + s.english)/3);
    return [s.name, s.math, s.science, s.english, avg, categoryOf(avg)];
  });

  doc.autoTable({
    startY: 240,
    head: [['Name','Math','Science','English','Avg','Category']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [11,131,181] }
  });

  doc.save('Crawford_Student_Performance_Report.pdf');
  toast('Professional PDF exported (charts + table)', 'success');
}

/* ---------- Dark mode toggle (with overlay animation) ---------- */
function updateChartTheme(){
  const dark = document.body.classList.contains('dark-mode');
  const color = dark ? '#fff' : '#0b1220';
  [performanceChart, subjectChart, trendChart, radarChart].forEach(c => {
    if (!c) return;
    if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels) c.options.plugins.legend.labels.color = color;
    if (c.options.scales && c.options.scales.x) c.options.scales.x.ticks = c.options.scales.x.ticks || {};
    if (c.options.scales && c.options.scales.y) c.options.scales.y.ticks = c.options.scales.y.ticks || {};
    c.update();
  });
}

if (localStorage.getItem('asp_theme') === 'dark'){ document.body.classList.add('dark-mode'); darkToggle.textContent='☀'; updateChartTheme(); }
else { darkToggle.textContent='🌙'; }
darkToggle.addEventListener('click', ()=>{
  themeOverlay.style.opacity = '1';
  setTimeout(()=>{
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('asp_theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
    darkToggle.textContent = document.body.classList.contains('dark-mode') ? '☀' : '🌙';
    updateChartTheme();
    themeOverlay.style.opacity = '0';
    toast('Theme switched', 'info');
  }, 180);
});

/* ---------- UI events ---------- */
searchInput.addEventListener('input', applyFilters);
filterSelect.addEventListener('change', applyFilters);

/* generate suggestions on button */
genRecsBtn.addEventListener('click', generateSuggestions);

/* exports */
exportCSVBtn.addEventListener('click', exportCSV);
exportPDFBtn.addEventListener('click', exportPDF);

/* ---------- Initialize UI ---------- */
function init(){
  initCharts();
  renderTable();
  updateCharts();
  startTrendSimulation();
}

/* small trend simulation (append random point) */
function startTrendSimulation(){
  setInterval(()=>{
    const next = Math.floor(Math.random()*12)+65;
    trendChart.data.datasets[0].data.push(next);
    if (trendChart.data.datasets[0].data.length > 12) trendChart.data.datasets[0].data.shift();
    trendChart.update();
  }, 7000);
}

/* initial render helpers */
function initCharts(){ /* defined above but need function presence */ }
initCharts = initCharts; // no-op to keep editor happy (function was already defined)

function renderTable(){ renderTable = renderTable; /* placeholder to avoid duplication */ }
renderTable = function(list = students){ studentTableBody.innerHTML = ''; list.forEach((s, idx) => {
  const avg = Math.round((s.math + s.science + s.english)/3);
  const cat = categoryOf(avg);
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${idx+1}</td><td>${s.name}</td><td>${s.math}</td><td>${s.science}</td><td>${s.english}</td><td>${avg}</td><td>${cat}</td>`;
  studentTableBody.appendChild(tr);
});
$('#kpiTotal').textContent = students.length;
const avgAll = Math.round(students.reduce((a,b)=> a + (b.math+b.science+b.english)/3,0)/ students.length);
$('#kpiAvg').textContent = `${avgAll}%`;
const risk = students.filter(s => ((s.math+s.science+s.english)/3) < 50).length;
$('#kpiRisk').textContent = risk; };

function updateCharts(list = students){
  performanceChart.data.labels = list.map(s=>s.name);
  performanceChart.data.datasets[0].data = list.map(s=>s.math);
  performanceChart.data.datasets[1].data = list.map(s=>s.science);
  performanceChart.data.datasets[2].data = list.map(s=>s.english);
  performanceChart.update();
  subjectChart.data.datasets[0].data = calcSubjectAverages(list);
  subjectChart.update();
  const top = list.length ? list.reduce((a,b)=> ((a.math+a.science+a.english)>(b.math+b.science+b.english)?a:b)) : {name:'N/A',math:0,science:0,english:0};
  radarChart.data.datasets[0].label = top.name;
  radarChart.data.datasets[0].data = [top.math, top.science, top.english];
  radarChart.update();
}

/* ---------- finalize init ---------- */
window.addEventListener('DOMContentLoaded', ()=>{
  // re-initialize charts (declare properly)
  initCharts = function(){
    const names = students.map(s=>s.name);
    performanceChart = new Chart(performanceChartEl.getContext('2d'), {
      type:'bar',
      data: { labels:names, datasets:[
        { label:'Math', data:students.map(s=>s.math), backgroundColor:'#0b83b5' },
        { label:'Science', data:students.map(s=>s.science), backgroundColor:'#0ea5a4' },
        { label:'English', data:students.map(s=>s.english), backgroundColor:'#f59e0b' }
      ]},
      options:{ responsive:true, plugins:{legend:{position:'top'}}, scales:{y:{beginAtZero:true, max:100}}}
    });

    subjectChart = new Chart(subjectChartEl.getContext('2d'), {
      type:'doughnut',
      data:{ labels:['Math','Science','English'], datasets:[{ data:calcSubjectAverages(students), backgroundColor:['#0b83b5','#0ea5a4','#f59e0b'] }]},
      options:{ responsive:true, plugins:{legend:{position:'bottom'}}}
    });

    trendChart = new Chart(trendChartEl.getContext('2d'), {
      type:'line',
      data:{ labels:['Week 1','Week 2','Week 3','Week 4'], datasets:[{ label:'Average', data:[62,68,73,76], borderColor:'#6610f2', fill:true, backgroundColor:'rgba(102,16,242,0.08)'}]},
      options:{ responsive:true, scales:{y:{beginAtZero:true, max:100}}}
    });

    const first = students[0];
    radarChart = new Chart(radarChartEl.getContext('2d'), {
      type:'radar',
      data:{ labels:['Math','Science','English'], datasets:[{ label:first.name, data:[first.math, first.science, first.english], backgroundColor:'rgba(11,131,181,0.18)', borderColor:'#0b83b5' }]},
      options:{ responsive:true, scales:{r:{beginAtZero:true, max:100}}}
    });
  };

  // now run init
  initCharts();
  renderTable();
  updateCharts();
  startTrendSimulation();
  toast('Demo dataset loaded — ready for presentation', 'success');
});
