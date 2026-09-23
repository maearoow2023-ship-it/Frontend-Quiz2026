let currentSession = null;
let allQuizzes = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentSession = await requireAuth(['Admin', 'Teacher']);
  if (!currentSession) return;
  await loadSubjects();
  await loadQuizList();
});

async function loadSubjects() {
  const subjects = await apiGet({ action: 'list', key: 'SUBJECTS' });
  const select = document.getElementById('quizSubject');
  select.innerHTML = subjects.length
    ? subjects.map(s => `<option value="${s.subjectId}">${s.subjectName}</option>`).join('')
    : `<option value="">-- ยังไม่มีวิชา กรุณาเพิ่มวิชาก่อน --</option>`;
}

async function quickAddSubject() {
  const { value: subjectName } = await Swal.fire({
    title: 'เพิ่มวิชาใหม่', input: 'text', inputPlaceholder: 'ชื่อวิชา',
    showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก'
  });
  if (!subjectName) return;
  try {
    await apiPost({ action: 'create', key: 'SUBJECTS', data: { subjectName, teacherId: currentSession.userId, status: 'Active' } });
    await loadSubjects();
    Swal.fire('สำเร็จ', 'เพิ่มวิชาเรียบร้อย', 'success');
  } catch (err) { Swal.fire('ผิดพลาด', err.message, 'error'); }
}

async function loadQuizList() {
  allQuizzes = await apiGet({ action: 'quizList', token: currentSession.token });
  renderQuizTable(allQuizzes);
}

function renderQuizTable(list) {
  const statusBadge = { Draft: 'secondary', Active: 'success', Closed: 'danger' };
  document.getElementById('quizTableBody').innerHTML = list.length ? list.map(q => `
    <tr>
      <td class="fw-semibold">${q.title}</td><td>${q.subjectName}</td><td>${q.type}</td>
      <td>${q.totalQuestions}</td><td>${q.totalScore}</td><td>${q.timeLimit || '-'}</td>
      <td><span class="badge bg-${statusBadge[q.status] || 'secondary'}">${q.status}</span></td>
      <td>
        <a href="quiz-editor.html?quizId=${q.quizId}" class="btn btn-sm btn-primary-custom" title="จัดการคำถาม"><i class="fa-solid fa-list-check"></i></a>
        <button class="btn btn-sm btn-secondary-custom" onclick='editQuiz(${JSON.stringify(q).replace(/'/g,"&#39;")})' title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
        <button class="btn btn-sm btn-danger-custom" onclick="removeQuiz('${q.quizId}')" title="ลบ"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>`).join('') : `<tr><td colspan="8" class="text-center text-muted py-4">ยังไม่มีแบบทดสอบ</td></tr>`;
}

function filterQuizTable() {
  const keyword = document.getElementById('searchInput').value.toLowerCase();
  renderQuizTable(allQuizzes.filter(q => q.title.toLowerCase().includes(keyword)));
}

function openQuizModal() {
  document.getElementById('quizModalTitle').textContent = 'สร้างแบบทดสอบใหม่';
  ['quizId','quizTitle','quizOpenDate','quizCloseDate'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('quizType').value = 'Quiz';
  document.getElementById('quizTimeLimit').value = 0;
  document.getElementById('quizPassScore').value = 50;
  document.getElementById('quizMaxAttempts').value = 1;
  document.getElementById('quizShowAnswer').value = 'AfterSubmit';
  document.getElementById('quizStatus').value = 'Draft';
  document.getElementById('quizRandomQuestion').checked = false;
  document.getElementById('quizRandomChoice').checked = false;
  new bootstrap.Modal(document.getElementById('quizModal')).show();
}

function editQuiz(q) {
  document.getElementById('quizModalTitle').textContent = 'แก้ไขแบบทดสอบ';
  document.getElementById('quizId').value = q.quizId;
  document.getElementById('quizTitle').value = q.title;
  document.getElementById('quizType').value = q.type;
  document.getElementById('quizTimeLimit').value = q.timeLimit || 0;
  document.getElementById('quizStatus').value = q.status;
  new bootstrap.Modal(document.getElementById('quizModal')).show();
}

async function submitQuiz() {
  const data = {
    quizId: document.getElementById('quizId').value || null,
    title: document.getElementById('quizTitle').value.trim(),
    type: document.getElementById('quizType').value,
    subjectId: document.getElementById('quizSubject').value,
    timeLimit: document.getElementById('quizTimeLimit').value,
    passScore: document.getElementById('quizPassScore').value,
    openDate: document.getElementById('quizOpenDate').value,
    closeDate: document.getElementById('quizCloseDate').value,
    maxAttempts: document.getElementById('quizMaxAttempts').value,
    showAnswer: document.getElementById('quizShowAnswer').value,
    status: document.getElementById('quizStatus').value,
    randomQuestion: document.getElementById('quizRandomQuestion').checked,
    randomChoice: document.getElementById('quizRandomChoice').checked
  };
  try {
    await apiPost({ action: 'saveQuiz', token: currentSession.token, data });
    bootstrap.Modal.getInstance(document.getElementById('quizModal')).hide();
    Swal.fire('สำเร็จ', 'บันทึกแบบทดสอบเรียบร้อย', 'success');
    loadQuizList();
  } catch (err) { Swal.fire('ผิดพลาด', err.message, 'error'); }
}

async function removeQuiz(quizId) {
  const confirm = await Swal.fire({
    title: 'ยืนยันการลบ?', text: 'ข้อสอบและคำถามทั้งหมดในแบบทดสอบนี้จะถูกลบถาวร',
    icon: 'warning', showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#FF6B6B'
  });
  if (!confirm.isConfirmed) return;
  try {
    await apiPost({ action: 'deleteQuiz', token: currentSession.token, id: quizId });
    Swal.fire('ลบแล้ว', '', 'success');
    loadQuizList();
  } catch (err) { Swal.fire('ผิดพลาด', err.message, 'error'); }
}
