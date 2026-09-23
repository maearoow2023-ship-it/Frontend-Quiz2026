document.addEventListener('DOMContentLoaded', async () => {
  const session = await requireAuth(['Admin', 'Teacher', 'Student']);
  if (!session) return;

  const attemptId = new URLSearchParams(window.location.search).get('attemptId');
  if (!attemptId) return window.location.href = 'dashboard.html';

  Swal.fire({ title: 'กำลังโหลดผลคะแนน...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
  try {
    const data = await apiGet({ action: 'attemptResult', token: session.token, attemptId });
    renderResult(data);
    Swal.close();
  } catch (err) { Swal.fire('เกิดข้อผิดพลาด', err.message, 'error'); }
});

const GRADE_COLOR = { A: '#2AA7A1', B: '#6BCB77', C: '#FFD93D', D: '#FF9F45', F: '#FF6B6B' };

function renderResult(d) {
  document.getElementById('resultQuizTitle').textContent = d.quizTitle;
  document.getElementById('resultScore').textContent = `${d.totalScore} / ${d.fullScore}`;
  document.getElementById('resultPercentage').textContent = `${d.percentage}%`;
  document.getElementById('resultRanking').textContent = d.ranking !== '-' ? `#${d.ranking}` : '-';
  document.getElementById('resultTime').textContent = formatTime_(d.timeUsed);

  const circle = document.getElementById('gradeCircle');
  circle.textContent = d.grade;
  circle.style.background = GRADE_COLOR[d.grade] || '#999';

  const passEl = document.getElementById('passStatusText');
  passEl.innerHTML = d.passStatus === 'Pass'
    ? '<span style="color:var(--secondary)"><i class="fa-solid fa-circle-check me-1"></i>ผ่านเกณฑ์</span>'
    : '<span style="color:var(--danger)"><i class="fa-solid fa-circle-xmark me-1"></i>ไม่ผ่านเกณฑ์</span>';

  if (!d.showAnswer) {
    document.getElementById('reviewSection').innerHTML = `<div class="glass-card p-4 text-center text-muted">ผู้สอนยังไม่เปิดให้ดูเฉลยสำหรับแบบทดสอบนี้</div>`;
    return;
  }

  document.getElementById('reviewSection').innerHTML = `<h6 class="mb-3">เฉลยและคำอธิบาย</h6>` + d.details.map((q, i) => `
    <div class="glass-card p-3 mb-3 review-item ${q.isCorrect ? 'review-correct' : 'review-wrong'}">
      <div class="d-flex justify-content-between">
        <p class="fw-semibold mb-2">${i + 1}. ${q.questionText}</p>
        <span class="badge ${q.isCorrect ? 'bg-success' : 'bg-danger'}">${q.scoreObtained}/${q.score} คะแนน</span>
      </div>
      ${renderReviewBody_(q)}
      ${q.explanation ? `<div class="mt-2 p-2 rounded" style="background:rgba(42,167,161,0.1);"><i class="fa-solid fa-lightbulb me-1" style="color:var(--warning)"></i>${q.explanation}</div>` : ''}
      ${q.referenceLink ? `<a href="${q.referenceLink}" target="_blank" class="d-inline-block mt-2">อ่านเพิ่มเติม <i class="fa-solid fa-arrow-up-right-from-square ms-1"></i></a>` : ''}
    </div>`).join('');
}

function renderReviewBody_(q) {
  if (q.questionType === 'FillBlank') {
    const correctAnswers = q.choices.map(c => c.choiceText).join(' / ');
    return `<p class="mb-1">คำตอบของคุณ: <strong>${q.studentAnswerText || '(ไม่ได้ตอบ)'}</strong></p>
            <p class="mb-0">เฉลย: <strong style="color:var(--secondary)">${correctAnswers}</strong></p>`;
  }
  return `<ul class="mb-0 ps-3">${q.choices.map(c => {
    const wasSelected = q.studentSelectedIds.includes(c.choiceId);
    const isCorrect = c.isCorrect;
    let style = '';
    if (isCorrect) style = 'color:var(--secondary); font-weight:700;';
    else if (wasSelected && !isCorrect) style = 'color:var(--danger); text-decoration:line-through;';
    return `<li style="${style}">${c.choiceText} ${wasSelected ? '<i class="fa-solid fa-user ms-1" title="คำตอบของคุณ"></i>' : ''} ${isCorrect ? '<i class="fa-solid fa-check ms-1"></i>' : ''}</li>`;
  }).join('')}</ul>`;
}

function formatTime_(seconds) {
  if (!seconds) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} นาที ${s} วินาที`;
}
