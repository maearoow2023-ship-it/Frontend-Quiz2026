let session = null;
let quizId = null;
let quizData = null;

const TYPE_LABEL = { MultipleChoice: 'ปรนัย 4 ตัวเลือก', TrueFalse: 'ถูก / ผิด', FillBlank: 'เติมคำในช่องว่าง', MultipleSelect: 'เลือกหลายคำตอบ' };

document.addEventListener('DOMContentLoaded', async () => {
  session = await requireAuth(['Admin', 'Teacher']);
  if (!session) return;
  quizId = new URLSearchParams(window.location.search).get('quizId');
  if (!quizId) { window.location.href = 'quiz-manage.html'; return; }
  await loadQuiz();
});

async function loadQuiz() {
  quizData = await apiGet({ action: 'quizDetail', token: session.token, quizId });
  document.getElementById('quizTitleHeader').textContent = quizData.title;
  document.getElementById('totalQuestions').textContent = quizData.questions.length;
  document.getElementById('totalScore').textContent = quizData.totalScore;
  renderQuestionList();
}

function renderQuestionList() {
  const container = document.getElementById('questionList');
  if (!quizData.questions.length) {
    container.innerHTML = `<div class="glass-card p-4 text-center text-muted">ยังไม่มีคำถามในแบบทดสอบนี้</div>`;
    return;
  }
  container.innerHTML = quizData.questions.map((q, idx) => `
    <div class="glass-card p-3 mb-3 question-card">
      <div class="d-flex justify-content-between align-items-start">
        <div class="flex-grow-1">
          <span class="badge bg-info type-badge mb-2">${TYPE_LABEL[q.questionType]}</span>
          <span class="badge bg-warning type-badge mb-2">${q.score} คะแนน</span>
          <p class="mb-2 fw-semibold">ข้อ ${idx + 1}. ${q.questionText}</p>
          <ul class="mb-0 ps-3">
            ${q.choices.map(c => `<li style="color:${c.isCorrect ? '#2AA7A1' : 'inherit'}; font-weight:${c.isCorrect ? '700' : '400'}">${c.choiceText} ${c.isCorrect ? '<i class="fa-solid fa-check ms-1"></i>' : ''}</li>`).join('')}
          </ul>
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-secondary-custom" onclick='editQuestion(${JSON.stringify(q).replace(/'/g,"&#39;")})'><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-sm btn-danger-custom" onclick="removeQuestion('${q.questionId}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('');
}

function openQuestionModal() {
  document.getElementById('questionModalTitle').textContent = 'เพิ่มคำถาม';
  document.getElementById('questionId').value = '';
  document.getElementById('questionType').value = 'MultipleChoice';
  document.getElementById('questionText').value = '';
  document.getElementById('questionScore').value = 1;
  document.getElementById('questionDifficulty').value = 'Medium';
  document.getElementById('questionExplanation').value = '';
  renderChoiceBuilder();
  new bootstrap.Modal(document.getElementById('questionModal')).show();
}

function editQuestion(q) {
  document.getElementById('questionModalTitle').textContent = 'แก้ไขคำถาม';
  document.getElementById('questionId').value = q.questionId;
  document.getElementById('questionType').value = q.questionType;
  document.getElementById('questionText').value = q.questionText;
  document.getElementById('questionScore').value = q.score;
  document.getElementById('questionDifficulty').value = q.difficultyLevel || 'Medium';
  document.getElementById('questionExplanation').value = q.explanation || '';
  renderChoiceBuilder(q.choices);
  new bootstrap.Modal(document.getElementById('questionModal')).show();
}

function renderChoiceBuilder(existingChoices = null) {
  const type = document.getElementById('questionType').value;
  const builder = document.getElementById('choiceBuilder');

  if (type === 'MultipleChoice') {
    const choices = existingChoices || [{},{},{},{}];
    builder.innerHTML = `<label class="form-label fw-semibold">ตัวเลือกคำตอบ (เลือกคำตอบที่ถูกต้อง 1 ข้อ)</label>
      <div id="choiceRows">${choices.map((c, i) => choiceRowRadio(i, c)).join('')}</div>
      <button class="btn btn-sm btn-secondary-custom mt-2" type="button" onclick="addChoiceRow('radio')"><i class="fa-solid fa-plus me-1"></i>เพิ่มตัวเลือก</button>`;
  } else if (type === 'TrueFalse') {
    const trueCorrect = existingChoices ? existingChoices.find(c => c.choiceText === 'ถูก')?.isCorrect : true;
    builder.innerHTML = `<label class="form-label fw-semibold">เลือกคำตอบที่ถูกต้อง</label>
      <div class="choice-row"><input type="radio" name="tfRadio" value="ถูก" ${trueCorrect ? 'checked' : ''}> <span class="ms-2">ถูก</span></div>
      <div class="choice-row"><input type="radio" name="tfRadio" value="ผิด" ${!trueCorrect ? 'checked' : ''}> <span class="ms-2">ผิด</span></div>`;
  } else if (type === 'FillBlank') {
    const choices = existingChoices && existingChoices.length ? existingChoices : [{}];
    builder.innerHTML = `<label class="form-label fw-semibold">คำเฉลยที่ยอมรับได้ (เพิ่มได้หลายคำ)</label>
      <div id="choiceRows">${choices.map((c, i) => choiceRowText(i, c)).join('')}</div>
      <button class="btn btn-sm btn-secondary-custom mt-2" type="button" onclick="addChoiceRow('text')"><i class="fa-solid fa-plus me-1"></i>เพิ่มคำเฉลย</button>`;
  } else if (type === 'MultipleSelect') {
    const choices = existingChoices && existingChoices.length ? existingChoices : [{},{},{},{}];
    builder.innerHTML = `<label class="form-label fw-semibold">ตัวเลือกคำตอบ (เลือกคำตอบที่ถูกต้องได้ตั้งแต่ 2 ข้อขึ้นไป)</label>
      <div id="choiceRows">${choices.map((c, i) => choiceRowCheckbox(i, c)).join('')}</div>
      <button class="btn btn-sm btn-secondary-custom mt-2" type="button" onclick="addChoiceRow('checkbox')"><i class="fa-solid fa-plus me-1"></i>เพิ่มตัวเลือก</button>`;
  }
}

function choiceRowRadio(i, c) {
  return `<div class="choice-row" data-idx="${i}">
    <input type="radio" name="mcRadio" value="${i}" ${c.isCorrect ? 'checked' : ''}>
    <input type="text" class="form-control choice-text" value="${c.choiceText || ''}" placeholder="ตัวเลือกที่ ${i+1}">
    <button class="btn btn-sm btn-danger-custom" type="button" onclick="removeChoiceRow(this)"><i class="fa-solid fa-times"></i></button></div>`;
}
function choiceRowCheckbox(i, c) {
  return `<div class="choice-row" data-idx="${i}">
    <input type="checkbox" class="choice-correct" ${c.isCorrect ? 'checked' : ''}>
    <input type="text" class="form-control choice-text" value="${c.choiceText || ''}" placeholder="ตัวเลือกที่ ${i+1}">
    <button class="btn btn-sm btn-danger-custom" type="button" onclick="removeChoiceRow(this)"><i class="fa-solid fa-times"></i></button></div>`;
}
function choiceRowText(i, c) {
  return `<div class="choice-row" data-idx="${i}">
    <input type="text" class="form-control choice-text" value="${c.choiceText || ''}" placeholder="คำเฉลยที่ยอมรับได้ #${i+1}">
    <button class="btn btn-sm btn-danger-custom" type="button" onclick="removeChoiceRow(this)"><i class="fa-solid fa-times"></i></button></div>`;
}

function addChoiceRow(kind) {
  const container = document.getElementById('choiceRows');
  const idx = container.children.length;
  const html = kind === 'radio' ? choiceRowRadio(idx, {}) : kind === 'checkbox' ? choiceRowCheckbox(idx, {}) : choiceRowText(idx, {});
  container.insertAdjacentHTML('beforeend', html);
}

function removeChoiceRow(btn) {
  const row = btn.closest('.choice-row');
  const container = row.parentElement;
  if (container.children.length <= (document.getElementById('questionType').value === 'FillBlank' ? 1 : 2)) {
    return Swal.fire('แจ้งเตือน', 'ต้องมีตัวเลือกอย่างน้อยที่กำหนด', 'warning');
  }
  row.remove();
}

function collectChoices() {
  const type = document.getElementById('questionType').value;
  if (type === 'MultipleChoice') {
    const selected = document.querySelector('input[name="mcRadio"]:checked')?.value;
    return Array.from(document.querySelectorAll('#choiceRows .choice-row')).map((row, i) => ({
      choiceText: row.querySelector('.choice-text').value.trim(), isCorrect: String(i) === selected
    }));
  }
  if (type === 'TrueFalse') {
    const selected = document.querySelector('input[name="tfRadio"]:checked')?.value;
    return [ { choiceText: 'ถูก', isCorrect: selected === 'ถูก' }, { choiceText: 'ผิด', isCorrect: selected === 'ผิด' } ];
  }
  if (type === 'FillBlank') {
    return Array.from(document.querySelectorAll('#choiceRows .choice-row')).map(row => ({ choiceText: row.querySelector('.choice-text').value.trim(), isCorrect: true }));
  }
  if (type === 'MultipleSelect') {
    return Array.from(document.querySelectorAll('#choiceRows .choice-row')).map(row => ({
      choiceText: row.querySelector('.choice-text').value.trim(), isCorrect: row.querySelector('.choice-correct').checked
    }));
  }
  return [];
}

async function submitQuestion() {
  const data = {
    questionId: document.getElementById('questionId').value || null,
    quizId: quizId, questionType: document.getElementById('questionType').value,
    questionText: document.getElementById('questionText').value.trim(),
    score: document.getElementById('questionScore').value,
    difficultyLevel: document.getElementById('questionDifficulty').value,
    explanation: document.getElementById('questionExplanation').value.trim(),
    order: quizData.questions.length, choices: collectChoices()
  };
  try {
    await apiPost({ action: 'saveQuestion', token: session.token, data });
    bootstrap.Modal.getInstance(document.getElementById('questionModal')).hide();
    Swal.fire('สำเร็จ', 'บันทึกคำถามเรียบร้อย', 'success');
    await loadQuiz();
  } catch (err) { Swal.fire('ตรวจสอบข้อมูล', err.message, 'error'); }
}

async function removeQuestion(questionId) {
  const confirm = await Swal.fire({
    title: 'ยืนยันการลบคำถาม?', icon: 'warning', showCancelButton: true,
    confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#FF6B6B'
  });
  if (!confirm.isConfirmed) return;
  try {
    await apiPost({ action: 'deleteQuestion', token: session.token, id: questionId });
    Swal.fire('ลบแล้ว', '', 'success');
    await loadQuiz();
  } catch (err) { Swal.fire('ผิดพลาด', err.message, 'error'); }
}
