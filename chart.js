/*************************************************
 * QUIZ SYSTEM - chart.js
 * Chart Rendering (Pie, Bar, Line, Radar)
 *************************************************/

const CHART_COLORS = ['#2AA7A1', '#6BCB77', '#FFD93D', '#FF6B6B', '#8E9AAF', '#B983FF'];

function renderPieChart(canvasId, labels, data) {
  return new Chart(document.getElementById(canvasId), {
    type: 'pie', data: { labels, datasets: [{ data, backgroundColor: CHART_COLORS }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderBarChart(canvasId, labels, data, label = 'คะแนนเฉลี่ย (%)') {
  return new Chart(document.getElementById(canvasId), {
    type: 'bar', data: { labels, datasets: [{ label, data, backgroundColor: '#2AA7A1', borderRadius: 8 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 } } }
  });
}

function renderLineChart(canvasId, labels, data, label = 'จำนวนผู้เข้าสอบ') {
  return new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: { labels, datasets: [{ label, data, borderColor: '#6BCB77', backgroundColor: 'rgba(107,203,119,0.2)', fill: true, tension: 0.4 }] },
    options: { responsive: true, plugins: { legend: { display: false } } }
  });
}

function renderRadarChart(canvasId, labels, data, label = 'คะแนนเฉลี่ยรายวิชา (%)') {
  return new Chart(document.getElementById(canvasId), {
    type: 'radar',
    data: { labels, datasets: [{ label, data, backgroundColor: 'rgba(42,167,161,0.3)', borderColor: '#2AA7A1', pointBackgroundColor: '#2AA7A1' }] },
    options: { responsive: true, scales: { r: { beginAtZero: true, max: 100 } } }
  });
}
