/*************************************************
 * QUIZ SYSTEM - app.js
 * Dashboard Controller
 *************************************************/

document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth(['Admin', 'Teacher', 'Student']);
  if (!session) return;

  document.getElementById('userFullName').textContent = session.fullName;
  document.getElementById('userRole').textContent = translateRole(session.role);
  if (session.profileImage) document.getElementById('userAvatar').src = session.profileImage;

  renderQuickLinks(session.role);

  Swal.fire({ title: 'กำลังโหลดข้อมูล...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    if (session.role === 'Student') {
      document.getElementById('studentDashboard').classList.remove('d-none');
      document.getElementById('teacherDashboard').classList.add('d-none');
      const data = await apiGet({ action: 'studentDashboard', token: session.token });
      renderStudentDashboard(data);
    } else {
      document.getElementById('teacherDashboard').classList.remove('d-none');
      document.getElementById('studentDashboard').classList.add('d-none');
      const data = await apiGet({ action: 'teacherDashboard', token: session.token });
      renderTeacherDashboard(data);
    }
    Swal.close();
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
});

function renderQuickLinks(role) {
  const links = role === 'Student'
    ? [ ['leaderboard.html','fa-ranking-star','กระดานผู้นำ'], ['certificate.html','fa-certificate','เกียรติบัตรของฉัน'] ]
    : [ ['quiz-manage.html','fa-file-pen','จัดการแบบทดสอบ'], ['report.html','fa-chart-column','รายงาน'], ['ai-generator.html','fa-robot','AI สร้างข้อสอบ'], ['leaderboard.html','fa-ranking-star','กระดานผู้นำ'] ];

  document.getElementById('quickLinks').innerHTML = links.map(([href, icon, text]) =>
    `<a href="${href}" class="btn btn-sm btn-primary-custom"><i class="fa-solid ${icon} me-1"></i>${text}</a>`
  ).join('');
}

function renderStudentDashboard(d) {
  setText('statTotalScore', d.totalScore);
  setText('statTotalQuizzes', d.totalQuizzes);
  setText('statCompleted', d.completedQuizzes);
  setText('statNotDone', d.notDoneCount);
  setText('statRanking', `#${d.ranking} / ${d.totalStudents}`);
  setText('statStudyTime', `${d.studyTimeMinutes} นาที`);
  setText('statLevel', `Lv.${d.level}`);
  setText('statXP', `${d.xp} XP`);
  setText('statCoin', `${d.coin} เหรียญ`);
  setText('statCertificate', d.certificateCount);

  const progressBar = document.getElementById('progressBar');
  progressBar.style.width = d.progress + '%';
  progressBar.textContent = d.progress + '%';

  const listEl = document.getElementById('notDoneList');
  listEl.innerHTML = d.notDoneList.length
    ? d.notDoneList.map(q => `
        <li class="list-group-item d-flex justify-content-between align-items-center glass-item">
          <span><i class="fa-solid fa-file-pen me-2" style="color:var(--primary)"></i>${q.title}</span>
          <a href="quiz.html?id=${q.quizId}" class="btn btn-sm btn-primary-custom">ทำแบบทดสอบ</a>
        </li>`).join('')
    : '<li class="list-group-item text-center text-muted">ทำครบทุกแบบทดสอบแล้ว </li>';
}

function renderTeacherDashboard(d) {
  setText('statTotalQuizzes2', d.totalQuizzes);
  setText('statTotalSubjects', d.totalSubjects);
  setText('statTotalParticipants', d.totalParticipants);
  setText('statAverageScore', d.averageScore + '%');
  setText('statPass', d.passCount);
  setText('statFail', d.failCount);
  setText('statMaxScore', d.maxScore + '%');
  setText('statMinScore', d.minScore + '%');

  renderPieChart('pieChart', d.charts.pie.labels, d.charts.pie.data);
  renderBarChart('barChart', d.charts.bar.labels, d.charts.bar.data);
  renderLineChart('lineChart', d.charts.line.labels, d.charts.line.data);
  renderRadarChart('radarChart', d.charts.radar.labels, d.charts.radar.data);
}

function exportDashboardPDF() { window.print(); }
function exportDashboardExcel() { Swal.fire('แจ้งเตือน', 'ระบบ Export Excel แบบเต็มรูปแบบจะอยู่ในหน้ารายงาน (report.html)', 'info'); }

function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function translateRole(role) { return { Admin: 'ผู้ดูแลระบบ', Teacher: 'ครูผู้สอน', Student: 'นักเรียน' }[role] || role; }

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

(function initDarkMode() {
  if (localStorage.getItem('darkMode') === 'true') {
    document.addEventListener('DOMContentLoaded', () => document.body.classList.add('dark-mode'));
  }
})();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
