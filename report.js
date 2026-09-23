let session = null;
let currentQuizId = null;
let currentReport = null;

document.addEventListener('DOMContentLoaded', async () => {
  session = await requireAuth(['Admin', 'Teacher']);
  if (!session) return;
  await loadQuizOptions();
});

async function loadQuizOptions() {
  const quizzes = await apiGet({ action: 'quizList', token: session.token });
  const select = document.getElementById('quizSelect');
  select.innerHTML = quizzes.length
    ? quizzes.map(q => `<option value="${q.quizId}">${q.title} (${q.totalQuestions} ข้อ)</option>`).join('')
    : '<option value="">-- ยังไม่มีแบบทดสอบ --</option>';
  if (quizzes.length) { currentQuizId = quizzes[0].quizId; loadReport(); }
}

async function loadReport() {
  currentQuizId = document.getElementById('quizSelect').value;
  if (!currentQuizId) return;
  Swal.fire({ title: 'กำลังโหลดรายงาน...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    currentReport = await apiGet({ action: 'reportByQuiz', token: session.token, quizId: currentQuizId });
    renderSummary(); renderByStudent(); renderByQuestion();
    Swal.close();
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
}

function renderSummary() {
  const r = currentReport;
  document.getElementById('summaryCards').innerHTML = `
    <div class="col-6 col-md-3"><div class="glass-card stat-card"><h3>${r.totalStudents}</h3><p>ผู้เข้าสอบ</p></div></div>
    <div class="col-6 col-md-3"><div class="glass-card stat-card"><h3>${r.averageScore}%</h3><p>คะแนนเฉลี่ย</p></div></div>
    <div class="col-6 col-md-3"><div class="glass-card stat-card"><h3>${r.completionRate}%</h3><p>อัตราการทำเสร็จ</p></div></div>
    <div class="col-6 col-md-3"><div class="glass-card stat-card"><h3>${r.byStudent.filter(s=>s.passStatus==='Pass').length}</h3><p>จำนวนผ่านเกณฑ์</p></div></div>`;
}

function renderByStudent() {
  const r = currentReport;
  document.getElementById('tabByStudent').innerHTML = `
    <div class="glass-card p-3"><div class="table-responsive"><table class="table align-middle">
      <thead><tr><th>อันดับ</th><th>ชื่อ</th><th>ห้อง</th><th>คะแนน</th><th>%</th><th>เกรด</th><th>สถานะ</th><th>เวลาที่ใช้</th><th></th></tr></thead>
      <tbody>${r.byStudent.map(s => `
        <tr><td>#${s.ranking}</td><td>${s.fullName}</td><td>${s.classRoom}</td><td>${s.totalScore}</td><td>${s.percentage}%</td>
          <td><span class="badge bg-${s.grade==='F'?'danger':'success'}">${s.grade}</span></td>
          <td>${s.passStatus === 'Pass' ? '<span class="text-success">ผ่าน</span>' : '<span class="text-danger">ไม่ผ่าน</span>'}</td>
          <td>${Math.round(s.timeUsed/60)} นาที</td>
          <td>${s.passStatus === 'Pass' ? `<button class="btn btn-sm btn-primary-custom" onclick="issueCert('${s.studentId}')"><i class="fa-solid fa-certificate"></i> ออกเกียรติบัตร</button>` : '-'}</td>
        </tr>`).join('')}</tbody></table></div></div>`;
}

function renderByQuestion() {
  const r = currentReport;
  document.getElementById('tabByQuestion').innerHTML = `
    <div class="row g-3">
      <div class="col-md-4"><div class="glass-card p-3"><h6 class="text-danger mb-3"><i class="fa-solid fa-triangle-exclamation me-1"></i>ข้อที่ผิดมากที่สุด</h6>
        ${r.mostWrong.map((q,i) => `<p class="mb-2 small">${i+1}. ${q.questionText} <span class="badge bg-danger">${q.wrongCount} คนผิด</span></p>`).join('')}</div></div>
      <div class="col-md-4"><div class="glass-card p-3"><h6 class="text-success mb-3"><i class="fa-solid fa-face-smile me-1"></i>ข้อที่ง่ายที่สุด</h6>
        ${r.easiest.map((q,i) => `<p class="mb-2 small">${i+1}. ${q.questionText} <span class="badge bg-success">${q.correctRate}% ถูก</span></p>`).join('')}</div></div>
      <div class="col-md-4"><div class="glass-card p-3"><h6 class="text-warning mb-3"><i class="fa-solid fa-face-tired me-1"></i>ข้อที่ยากที่สุด</h6>
        ${r.hardest.map((q,i) => `<p class="mb-2 small">${i+1}. ${q.questionText} <span class="badge bg-warning text-dark">${q.correctRate}% ถูก</span></p>`).join('')}</div></div>
    </div>
    <div class="glass-card p-3 mt-3"><h6 class="mb-3">สรุปรายข้อทั้งหมด</h6>
      <table class="table"><thead><tr><th>คำถาม</th><th>ตอบทั้งหมด</th><th>ถูก</th><th>ผิด</th><th>% ถูก</th></tr></thead>
      <tbody>${r.perQuestion.map(q => `<tr><td>${q.questionText}</td><td>${q.totalAnswered}</td><td>${q.correctCount}</td><td>${q.wrongCount}</td><td>${q.correctRate}%</td></tr>`).join('')}</tbody></table></div>`;
}

async function loadAnalysis() {
  Swal.fire({ title: 'กำลังวิเคราะห์ข้อสอบ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    const a = await apiGet({ action: 'itemAnalysis', token: session.token, quizId: currentQuizId });
    document.getElementById('tabAnalysis').innerHTML = `
      <div class="row g-3 mb-3">
        <div class="col-md-6"><div class="glass-card stat-card"><h3>${a.kr20}</h3><p>KR-20 (ความเชื่อมั่น)</p></div></div>
        <div class="col-md-6"><div class="glass-card stat-card"><h3>${a.cronbachAlpha}</h3><p>Cronbach's Alpha</p></div></div>
      </div>
      <div class="glass-card p-3 mb-3 text-center"><span class="badge" style="background:var(--primary); font-size:0.95rem;">${a.reliabilityLabel}</span></div>
      <div class="glass-card p-3"><table class="table align-middle">
        <thead><tr><th>คำถาม</th><th>Difficulty Index (P)</th><th>ระดับความยาก</th><th>Discrimination Index (D)</th><th>คุณภาพข้อสอบ</th></tr></thead>
        <tbody>${a.itemStats.map(item => `
          <tr><td>${item.questionText}</td><td>${item.difficultyIndex}</td><td><span class="badge bg-secondary">${item.difficultyLabel}</span></td>
            <td>${item.discriminationIndex}</td><td><span class="badge bg-${item.discriminationIndex >= 0.3 ? 'success' : item.discriminationIndex >= 0.2 ? 'warning' : 'danger'}">${item.discriminationLabel}</span></td>
          </tr>`).join('')}</tbody></table></div>`;
    Swal.close();
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
}

function switchTab(tab) {
  document.querySelectorAll('.report-tab').forEach(el => el.classList.add('d-none'));
  document.querySelectorAll('#reportTabs .nav-link').forEach(el => el.classList.remove('active'));
  document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.remove('d-none');
  event.target.classList.add('active');
  if (tab === 'analysis') loadAnalysis();
}

async function issueCert(studentId) {
  const confirm = await Swal.fire({
    title: 'ออกเกียรติบัตร?', text: 'ระบบจะสร้างเกียรติบัตร PDF และส่งอีเมลให้นักเรียนทันที',
    icon: 'question', showCancelButton: true, confirmButtonText: 'ออกเกียรติบัตร', cancelButtonText: 'ยกเลิก'
  });
  if (!confirm.isConfirmed) return;
  Swal.fire({ title: 'กำลังสร้างเกียรติบัตร...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    const cert = await apiPost({ action: 'issueCertificate', token: session.token, data: { studentId, quizId: currentQuizId } });
    Swal.fire({ icon: 'success', title: 'ออกเกียรติบัตรสำเร็จ', html: `<a href="${cert.fileUrl}" target="_blank" class="btn btn-primary-custom mt-2">ดาวน์โหลดเกียรติบัตร</a>` });
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
}

async function exportCSV() {
  try {
    const result = await apiPost({ action: 'exportReportCSV', token: session.token, data: { quizId: currentQuizId } });
    const blob = new Blob(['\uFEFF' + result.csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `report_${currentQuizId}.csv`;
    link.click();
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
}
