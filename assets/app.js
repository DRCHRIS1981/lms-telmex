// =============================================
// APP.JS — Lógica principal del LMS
// =============================================

// ── Estado global ────────────────────────────
let currentLesson = 0;
let currentQ = 0;
let score = 0;
let selected = null;
let answered = false;

// ── Navegación entre vistas ──────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));

  const viewEl = document.getElementById('view-' + name);
  if (viewEl) viewEl.classList.add('active');

  // Activar tab de nav
  const tabMap = { dashboard: 0, lesson: 1, quiz: 2, progress: 3, certificate: 4 };
  const tabs = document.querySelectorAll('.nav-tab');
  if (tabMap[name] !== undefined && tabs[tabMap[name]]) {
    tabs[tabMap[name]].classList.add('active');
  }

  // Activar item sidebar
  const sidebarMap = { dashboard: 0 };
  if (name === 'dashboard') {
    document.querySelectorAll('.sidebar-item')[0]?.classList.add('active');
  }

  if (name === 'lesson') renderLesson();
}

// ── Lecciones ────────────────────────────────
function setLesson(idx) {
  currentLesson = Math.max(0, Math.min(idx, lessons.length - 1));
  renderLesson();
}

function renderLesson() {
  const l = lessons[currentLesson];
  if (!l) return;

  document.getElementById('lesson-module-title').textContent = l.module;
  document.getElementById('lesson-title').textContent = l.title;
  document.getElementById('lesson-video-label').textContent = 'Lección: ' + l.title;
  document.getElementById('lesson-body').textContent = l.body;
  document.getElementById('lesson-extra').textContent = l.extra;

  const codeEl = document.getElementById('lesson-code');
  if (l.code) {
    codeEl.innerHTML = l.code;
    codeEl.style.display = 'block';
  } else {
    codeEl.style.display = 'none';
  }

  renderLessonList();
}

function renderLessonList() {
  const listEl = document.getElementById('lessons-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  lessons.forEach((les, i) => {
    const btn = document.createElement('button');
    btn.className = 'lesson-item' + (i === currentLesson ? ' active-lesson' : '');

    const iconClass = les.status === 'done' ? 'done' : les.status === 'current' ? 'current' : 'locked';
    const iconName  = les.status === 'done' ? 'ti-check' : les.status === 'current' ? 'ti-player-play' : 'ti-lock';

    btn.innerHTML = `
      <div class="lesson-icon ${iconClass}">
        <i class="ti ${iconName}"></i>
      </div>
      <div class="lesson-text">
        <div class="lesson-name">${les.title}</div>
        <div class="lesson-dur">${les.dur}</div>
      </div>`;

    if (les.status !== 'locked') {
      btn.onclick = () => setLesson(i);
    } else {
      btn.style.opacity = '0.5';
      btn.style.cursor = 'not-allowed';
    }

    listEl.appendChild(btn);
  });
}

function nextLesson() {
  const next = currentLesson + 1;
  if (next < lessons.length && lessons[next].status !== 'locked') {
    setLesson(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ── Quiz ─────────────────────────────────────
function renderQuiz() {
  const q = questions[currentQ];
  document.getElementById('q-counter').textContent =
    `Pregunta ${currentQ + 1} de ${questions.length}`;
  document.getElementById('q-prog-fill').style.width =
    `${((currentQ + 1) / questions.length) * 100}%`;

  document.getElementById('btn-check').style.display = 'inline-flex';
  document.getElementById('btn-next').style.display = 'none';
  selected = null;
  answered = false;

  const area = document.getElementById('quiz-area');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="question-card">
      <div class="q-number">Pregunta ${currentQ + 1}</div>
      <div class="q-text">${q.q}</div>
      <div class="options-list">
        ${q.opts.map((o, i) => `
          <div class="option" id="opt-${i}" onclick="selectOption(${i})">
            <div class="option-circle">${String.fromCharCode(65 + i)}</div>
            ${o}
          </div>`).join('')}
      </div>
      <div class="feedback" id="feedback"></div>
    </div>`;
}

function selectOption(i) {
  if (answered) return;
  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  const opt = document.getElementById(`opt-${i}`);
  if (opt) opt.classList.add('selected');
  selected = i;
}

function checkAnswer() {
  if (selected === null) return;
  answered = true;

  const q = questions[currentQ];
  const fb = document.getElementById('feedback');

  document.querySelectorAll('.option').forEach((o, i) => {
    if (i === q.correct) o.classList.add('correct');
    else if (i === selected && i !== q.correct) o.classList.add('wrong');
  });

  if (selected === q.correct) {
    score++;
    fb.className = 'feedback show correct-fb';
    fb.innerHTML = `<i class="ti ti-check"></i> ¡Correcto! ${q.explanation || ''}`;
  } else {
    fb.className = 'feedback show wrong-fb';
    fb.innerHTML = `<i class="ti ti-x"></i> Incorrecto. Respuesta: <strong>${q.opts[q.correct]}</strong>. ${q.explanation || ''}`;
  }

  document.getElementById('btn-check').style.display = 'none';

  if (currentQ < questions.length - 1) {
    document.getElementById('btn-next').style.display = 'inline-flex';
  } else {
    setTimeout(showResult, 600);
  }
}

function nextQuestion() {
  currentQ++;
  renderQuiz();
}

function showResult() {
  const quizNavEl = document.getElementById('quiz-nav');
  const quizAreaEl = document.getElementById('quiz-area');
  const quizResultEl = document.getElementById('quiz-result');
  if (quizNavEl) quizNavEl.style.display = 'none';
  if (quizAreaEl) quizAreaEl.style.display = 'none';
  if (quizResultEl) quizResultEl.style.display = 'block';

  const pct = Math.round((score / questions.length) * 100);
  document.getElementById('result-score').textContent =
    `${score} de ${questions.length} correctas — ${pct}%`;
  document.getElementById('result-msg').textContent =
    pct >= 80
      ? '¡Excelente! Superaste el umbral mínimo para obtener el certificado de este módulo.'
      : 'Sigue practicando — necesitas al menos 80% para desbloquear el certificado.';
}

function resetQuiz() {
  currentQ = 0; score = 0; selected = null; answered = false;
  const quizNavEl = document.getElementById('quiz-nav');
  const quizResultEl = document.getElementById('quiz-result');
  if (quizNavEl) quizNavEl.style.display = 'flex';
  if (quizResultEl) quizResultEl.style.display = 'none';
  renderQuiz();
}

// ── Init ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderQuiz();
  renderLessonList();
});
