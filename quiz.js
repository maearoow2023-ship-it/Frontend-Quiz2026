let session = null;
let quizState = null;
let answers = {};
let flagged = new Set();
let currentIndex = 0;
let timerInterval = null;
let secondsLeft = 0;
let hasSubmitted = false;
let saveTimeout = null;

document.addEventListener('DOMContentLoaded', async () => {
  session = await requireAuth(['Student']);
  if (!session) return;

  const quizId = new URLSearchParams(window.location.search).get('id');
  if (!quizId) return Swal.fire('ผิดพลาด', 'ไม่พบแบบทดสอบ', 'error').then(() => window.location.href = 'dashboard.html');

  try {
    quizState = await apiGet({ action: 'startQuiz', token: session.token, quizId });
    answers = quizState.savedAnswers || {};
    document.getElementById('quizTitle').textContent = quizState.title;
    document.getElementById('totalIndex').textContent = quizState.questions.length;

    if (quizState.timeLimit > 0) {
      const elapsed = Math.floor((Date.now() - new Date(quizState.startTime).getTime()) / 1000);
      secondsLeft = Math.max(quizState.timeLimit * 60 - elapsed, 0);
      startTimer();
    } else {
      document.getElementById('timerText').textContent = 'ไม่จำกัดเวลา';
    }

    renderPalette();
    renderQuestion(0);
    enableAntiRefresh();
  } catch (err) {
    Swal.fire('ไม่สามารถเริ่มทำแบบทดสอบได้', err.message, 'error').then(() => window.location.href = 'dashboard.html');
  }
});

function startTimer() {
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    secondsLeft--;
    updateTimerDisplay();
    if (secondsLeft === 60) Swal.fire({ icon: 'warning', title: 'เหลือเวลาอีก 1 นาที!', timer: 2000, showConfirmButton: false });
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
      Swal.fire({ icon: 'info', title: 'หมดเวลา', text: 'ระบบจะส่งคำตอบให้อัตโนมัติ', timer: 2000, showConfirmButton: false });
      setTimeout(submitQuiz, 2000);
    }
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const s = String(secondsLeft % 60).padStart(2, '0');
  document.getElementById('timerText').textContent = `${m}:${s}`;
  document.getElementById('timerBox').classList.toggle('timer-warning', secondsLeft <= 60 && secondsLeft > 0);
}

function renderQuestion(idx) {
  currentIndex = idx;
  const q = quizState.questions[idx];
  document.getElementById('currentIndex').textContent = idx + 1;
  document.getElementById('quizProgressBar').style.width = `${((idx + 1) / quizState.questions.length) * 100}%`;

  const saved = answers[q.questionId] || {};
  let bodyHtml = `<h5 class="mb-3">${idx + 1}. ${q.questionText}</h5>`;
  if (q.mediaUrl) bodyHtml += renderMedia_(q.mediaUrl, q.mediaType);

  if (q.questionType === 'MultipleChoice' || q.questionType === 'TrueFalse') {
    bodyHtml += q.choices.map(c => `
      <label class="choice-option ${saved.selectedChoiceId === c.choiceId ? 'selected' : ''}">
        <input type="radio" name="choice" value="${c.choiceId}" class="form-check-input me-2" ${saved.selectedChoiceId === c.choiceId ? 'checked' : ''} onchange="selectRadio('${q.questionId}','${c.choiceId}')">
        ${c.choiceText}
      </label>`).join('');
  } else if (q.questionType === 'MultipleSelect') {
    const selectedIds = saved.selectedChoiceId ? saved.selectedChoiceId.split(',') : [];
    bodyHtml += `<p class="text-muted small mb-2">* เลือกคำตอบที่ถูกต้องได้มากกว่า 1 ข้อ</p>`;
    bodyHtml += q.choices.map(c => `
      <label class="choice-option ${selectedIds.includes(c.choiceId) ? 'selected' : ''}">
        <input type="checkbox" value="${c.choiceId}" class="form-check-input me-2" ${selectedIds.includes(c.choiceId) ? 'checked' : ''} onchange="toggleCheckbox('${q.questionId}','${c.choiceId}')">
        ${c.choiceText}
      </label>`).join('');
  } else if (q.questionType === 'FillBlank') {
    bodyHtml += `<input type="text" class="form-control form-control-lg" placeholder="พิมพ์คำตอบของคุณ..." value="${saved.answerText || ''}" oninput="typeAnswer('${q.questionId}', this.value)">`;
  }

  document.getElementById('questionCard').innerHTML = bodyHtml;
  document.getElementById('btnPrev').disabled = idx === 0;
  document.getElementById('btnNext').innerHTML = idx === quizState.questions.length - 1
    ? '<i class="fa-solid fa-check me-1"></i>ข้อสุดท้าย' : 'ถัดไป<i class="fa-solid fa-arrow-right ms-1"></i>';
  updateFlagButton();
  highlightPalette();
}

function renderMedia_(url, type) {
  if (type === 'image') return `<img src="${url}" class="img-fluid rounded mb-3" style="max-height:320px;">`;
  if (type === 'audio') return `<audio controls class="w-100 mb-3"><source src="${url}"></audio>`;
  if (type === 'video') return `<video controls class="w-100 rounded mb-3" style="max-height:320px;"><source src="${url}"></video>`;
  if (type === 'youtube') return `<div class="ratio ratio-16x9 mb-3"><iframe src="${url}" allowfullscreen></iframe></div>`;
  return '';
}

function selectRadio(questionId, choiceId) {
  answers[questionId] = { selectedChoiceId: choiceId, answerText: '' };
  renderQuestion(currentIndex);
  scheduleSave(questionId);
}

function toggleCheckbox(questionId, choiceId) {
  const current = answers[questionId]?.selectedChoiceId ? answers[questionId].selectedChoiceId.split(',') : [];
  const idx = current.indexOf(choiceId);
  if (idx >= 0) current.splice(idx, 1); else current.push(choiceId);
  answers[questionId] = { selectedChoiceId: current.join(','), answerText: '' };
  highlightPalette();
  scheduleSave(questionId);
}

function typeAnswer(questionId, value) {
  answers[questionId] = { answerText: value, selectedChoiceId: '' };
  highlightPalette();
  scheduleSave(questionId);
}

function scheduleSave(questionId) {
  document.getElementById('autoSaveStatus').textContent = 'กำลังบันทึก...';
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      await apiPost({ action: 'saveProgress', token: session.token, data: { attemptId: quizState.attemptId, questionId, ...answers[questionId] } });
      document.getElementById('autoSaveStatus').textContent = 'บันทึกอัตโนมัติแล้ว ✓';
    } catch (e) { document.getElementById('autoSaveStatus').textContent = 'บันทึกไม่สำเร็จ'; }
  }, 600);
}

function toggleFlag() {
  const qId = quizState.questions[currentIndex].questionId;
  flagged.has(qId) ? flagged.delete(qId) : flagged.add(qId);
  updateFlagButton();
  highlightPalette();
}

function updateFlagButton() {
  const qId = quizState.questions[currentIndex].questionId;
  const btn = document.getElementById('btnFlag');
  btn.innerHTML = flagged.has(qId) ? '<i class="fa-solid fa-flag me-1"></i>ยกเลิกเครื่องหมาย' : '<i class="fa-regular fa-flag me-1"></i>ทำเครื่องหมาย';
}

function goPrev() { if (currentIndex > 0) renderQuestion(currentIndex - 1); }
function goNext(skip) {
  if (currentIndex < quizState.questions.length - 1) renderQuestion(currentIndex + 1);
  else if (!skip) confirmSubmit();
}

function renderPalette() {
  const container = document.getElementById('questionPalette');
  container.innerHTML = quizState.questions.map((q, i) => `<button class="palette-btn palette-empty" id="pal-${i}" onclick="renderQuestion(${i})">${i + 1}</button>`).join('');
}

function highlightPalette() {
  quizState.questions.forEach((q, i) => {
    const btn = document.getElementById('pal-' + i);
    btn.className = 'palette-btn';
    const ans = answers[q.questionId];
    const answered = ans && (ans.selectedChoiceId || (ans.answerText && ans.answerText.trim()));
    if (flagged.has(q.questionId)) btn.classList.add('palette-flagged');
    else if (answered) btn.classList.add('palette-answered');
    else btn.classList.add('palette-empty');
    if (i === currentIndex) btn.classList.add('palette-current');
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen();
  else document.exitFullscreen();
}

function enableAntiRefresh() {
  window.addEventListener('beforeunload', (e) => { if (hasSubmitted) return; e.preventDefault(); e.returnValue = ''; });
}

async function confirmSubmit() {
  const unanswered = quizState.questions.filter(q => {
    const ans = answers[q.questionId];
    return !ans || (!ans.selectedChoiceId && !(ans.answerText && ans.answerText.trim()));
  }).length;

  const result = await Swal.fire({
    title: 'ยืนยันการส่งข้อสอบ?',
    html: unanswered > 0 ? `คุณยังไม่ได้ตอบ <b>${unanswered}</b> ข้อ<br>ต้องการส่งเลยหรือไม่?` : 'คุณต้องการส่งคำตอบทั้งหมดใช่หรือไม่?',
    icon: 'warning', showCancelButton: true, confirmButtonText: 'ส่งข้อสอบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#FF6B6B'
  });
  if (result.isConfirmed) submitQuiz();
}

async function submitQuiz() {
  hasSubmitted = true;
  clearInterval(timerInterval);
  Swal.fire({ title: 'กำลังตรวจข้อสอบ...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    const result = await apiPost({ action: 'submitQuiz', token: session.token, data: { attemptId: quizState.attemptId } });
    window.location.href = `result.html?attemptId=${result.attemptId}`;
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
}
