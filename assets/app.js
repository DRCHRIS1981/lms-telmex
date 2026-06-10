// =============================================
// APP.JS — Lógica principal con Supabase
// =============================================

// ── Estado global ─────────────────────────────
let currentUser    = null;
let currentPerfil  = null;
let allCursos      = [];
let allLecciones   = [];
let currentCursoId = null;
let currentLesson  = 0;
let currentQ       = 0;
let quizPreguntas  = [];
let score          = 0;
let selected       = null;
let answered       = false;

// ── INIT ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Escuchar cambios de sesión
  sb.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      currentUser   = session.user;
      currentPerfil = await getPerfil(session.user.id);
      mostrarApp();
      await cargarDashboard();
    } else {
      currentUser   = null;
      currentPerfil = null;
      mostrarAuth();
    }
  });
});

// ── AUTH UI ───────────────────────────────────
function mostrarAuth() {
  document.getElementById('app-root').style.display  = 'none';
  document.getElementById('auth-root').style.display = 'flex';
}

function mostrarApp() {
  document.getElementById('auth-root').style.display = 'none';
  document.getElementById('app-root').style.display  = 'flex';
  // Mostrar nombre en navbar
  const nombre = currentPerfil?.nombre || currentUser?.email?.split('@')[0] || 'Usuario';
  document.getElementById('user-nombre').textContent = nombre;
  document.getElementById('user-avatar').textContent = nombre.charAt(0).toUpperCase();
}

function toggleAuthMode() {
  const loginForm    = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const isLogin      = loginForm.style.display !== 'none';
  loginForm.style.display    = isLogin ? 'none' : 'block';
  registerForm.style.display = isLogin ? 'block' : 'none';
  clearAuthError();
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  el.textContent = msg;
  el.style.display = 'block';
}

function clearAuthError() {
  const el = document.getElementById('auth-error');
  el.textContent = '';
  el.style.display = 'none';
}

async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showAuthError('Completa todos los campos.');
  setBtnLoading('btn-login', true);
  try {
    await login(email, password);
    // Detectar rol y redirigir
    const { data: rolData } = await sb.rpc('get_my_rol');
    if (rolData === 'admin') {
      window.location.href = 'admin.html';
    }
    // Si es alumno se queda en index.html (el onAuthStateChange lo maneja)
  } catch (e) {
    showAuthError('Correo o contraseña incorrectos.');
  } finally {
    setBtnLoading('btn-login', false);
  }
}

async function handleRegister() {
  const nombre   = document.getElementById('reg-nombre').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  if (!nombre || !email || !password) return showAuthError('Completa todos los campos.');
  if (password.length < 6) return showAuthError('La contraseña debe tener al menos 6 caracteres.');
  setBtnLoading('btn-register', true);
  try {
    await registrar(nombre, email, password);
    showAuthError('✅ Revisa tu correo para confirmar tu cuenta.');
  } catch (e) {
    showAuthError(e.message || 'Error al registrar.');
  } finally {
    setBtnLoading('btn-register', false);
  }
}

async function handleLogout() {
  await logout();
}

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled     = loading;
  btn.textContent  = loading ? 'Cargando...' : btn.dataset.label;
}

// ── NAVEGACIÓN ────────────────────────────────
function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(s => s.classList.remove('active'));

  const viewEl = document.getElementById('view-' + name);
  if (viewEl) viewEl.classList.add('active');

  const tabMap = { dashboard: 0, lesson: 1, quiz: 2, progress: 3, certificate: 4 };
  const tabs   = document.querySelectorAll('.nav-tab');
  if (tabMap[name] !== undefined && tabs[tabMap[name]]) {
    tabs[tabMap[name]].classList.add('active');
  }

  if (name === 'dashboard')   cargarDashboard();
  if (name === 'progress')    cargarProgreso();
  if (name === 'certificate') cargarCertificados();
  if (name === 'lesson')      renderLesson();
}

// ── DASHBOARD ─────────────────────────────────
async function cargarDashboard() {
  try {
    allCursos = await getCursos();
    renderCursos();
    if (currentUser) {
      await actualizarStats();
    }
  } catch (e) {
    console.error('Error cargando dashboard:', e);
  }
}

async function actualizarStats() {
  let totalLecciones = 0, completadas = 0;
  const progreso = await getProgreso(currentUser.id);
  completadas    = progreso.filter(p => p.completada).length;

  for (const curso of allCursos) {
    const lecs = await getLecciones(curso.id);
    totalLecciones += lecs.length;
  }

  document.getElementById('stat-completadas').textContent = completadas;
  document.getElementById('stat-total').textContent       = `de ${totalLecciones} totales`;

  const historial = await getHistorialQuiz(currentUser.id);
  if (historial.length) {
    const prom = Math.round(historial.reduce((a, r) => a + r.porcentaje, 0) / historial.length);
    document.getElementById('stat-quiz').textContent = prom + '%';
  }

  const certs = await getCertificados(currentUser.id);
  document.getElementById('stat-certs').textContent = certs.length;

  // Progreso general en sidebar
  const pct = totalLecciones ? Math.round((completadas / totalLecciones) * 100) : 0;
  document.getElementById('prog-fill-global').style.width = pct + '%';
  document.getElementById('prog-pct-text').textContent    = pct + '% completado';
}

function renderCursos() {
  const grid = document.getElementById('cursos-grid');
  if (!grid) return;
  grid.innerHTML = '';

  allCursos.forEach(curso => {
    const card = document.createElement('div');
    card.className = 'course-card';
    card.onclick   = () => abrirCurso(curso.id);
    card.innerHTML = `
      <div class="course-banner" style="background:${bannerColor(curso.tag)}; font-size:32px; display:flex; align-items:center; justify-content:center; height:72px;">${curso.emoji}</div>
      <div class="course-body">
        <span class="course-tag tag-${curso.tag}">${curso.tag.toUpperCase()}</span>
        <div class="course-title">${curso.titulo}</div>
        <div class="course-meta"><i class="ti ti-clock"></i> ${curso.duracion}</div>
        <div class="course-progress">
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#888; margin-top:8px;">
            <span>Progreso</span>
            <span id="pct-curso-${curso.id}">—</span>
          </div>
          <div class="course-prog-bar">
            <div class="course-prog-fill" id="bar-curso-${curso.id}" style="width:0%; background:${barColor(curso.tag)};"></div>
          </div>
        </div>
      </div>`;
    grid.appendChild(card);

    // Cargar progreso async
    if (currentUser) {
      calcularProgresoCurso(currentUser.id, curso.id).then(pct => {
        const pctEl = document.getElementById(`pct-curso-${curso.id}`);
        const barEl = document.getElementById(`bar-curso-${curso.id}`);
        if (pctEl) pctEl.textContent = pct + '%';
        if (barEl) barEl.style.width = pct + '%';
      });
    }
  });
}

function bannerColor(tag) {
  return tag === 'sql' ? '#EBF4FD' : tag === 'erp' ? '#E1F5EE' : '#FAEEDA';
}
function barColor(tag) {
  return tag === 'sql' ? '#185FA5' : tag === 'erp' ? '#1D9E75' : '#BA7517';
}

// ── LECCIONES ─────────────────────────────────
async function abrirCurso(cursoId) {
  currentCursoId = cursoId;
  showView('lesson');
  setLoading('lesson-loading', true);
  try {
    allLecciones   = await getLecciones(cursoId);
    currentLesson  = 0;
    renderLesson();
  } catch (e) {
    console.error('Error cargando lecciones:', e);
  } finally {
    setLoading('lesson-loading', false);
  }
}

function setLesson(idx) {
  currentLesson = Math.max(0, Math.min(idx, allLecciones.length - 1));
  renderLesson();
}

function renderLesson() {
  if (!allLecciones.length) return;
  const l = allLecciones[currentLesson];
  if (!l) return;

  const curso = allCursos.find(c => c.id === l.curso_id);
  document.getElementById('lesson-module-title').textContent = curso?.titulo || 'Lección';
  document.getElementById('lesson-title').textContent        = l.titulo;
  document.getElementById('lesson-video-label').textContent  = 'Lección: ' + l.titulo;
  document.getElementById('lesson-body').textContent         = l.cuerpo || '';
  document.getElementById('lesson-extra').textContent        = l.nota_extra || '';

  const codeEl = document.getElementById('lesson-code');
  if (l.codigo) {
    codeEl.textContent  = l.codigo;
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

  allLecciones.forEach((les, i) => {
    const btn       = document.createElement('button');
    btn.className   = 'lesson-item' + (i === currentLesson ? ' active-lesson' : '');
    const iconClass = les.estado === 'done' ? 'done' : les.estado === 'current' ? 'current' : 'locked';
    const iconName  = les.estado === 'done' ? 'ti-check' : les.estado === 'current' ? 'ti-player-play' : 'ti-lock';

    btn.innerHTML = `
      <div class="lesson-icon ${iconClass}"><i class="ti ${iconName}"></i></div>
      <div class="lesson-text">
        <div class="lesson-name">${les.titulo}</div>
        <div class="lesson-dur">${les.duracion}</div>
      </div>`;

    if (les.estado !== 'locked') {
      btn.onclick = () => setLesson(i);
    } else {
      btn.style.opacity = '0.5';
      btn.style.cursor  = 'not-allowed';
    }
    listEl.appendChild(btn);
  });
}

async function nextLesson() {
  // Marcar lección actual como completada
  if (currentUser && allLecciones[currentLesson]) {
    try {
      await marcarLeccionCompleta(currentUser.id, allLecciones[currentLesson].id);
    } catch (e) { console.warn('Error guardando progreso:', e); }
  }
  const next = currentLesson + 1;
  if (next < allLecciones.length && allLecciones[next].estado !== 'locked') {
    setLesson(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ── QUIZ ──────────────────────────────────────
async function abrirQuizCurso(cursoId) {
  currentCursoId = cursoId;
  showView('quiz');
  setLoading('quiz-loading', true);
  try {
    quizPreguntas = await getPreguntas(cursoId);
    const curso   = allCursos.find(c => c.id === cursoId);
    document.getElementById('quiz-titulo').textContent = 'Quiz: ' + (curso?.titulo || '');
    currentQ = 0; score = 0;
    renderQuiz();
  } catch (e) {
    console.error('Error cargando quiz:', e);
  } finally {
    setLoading('quiz-loading', false);
  }
}

function renderQuiz() {
  if (!quizPreguntas.length) {
    document.getElementById('quiz-area').innerHTML = '<p style="color:var(--text-sec)">No hay preguntas disponibles para este curso.</p>';
    return;
  }
  const q = quizPreguntas[currentQ];
  const opts = typeof q.opciones === 'string' ? JSON.parse(q.opciones) : q.opciones;

  document.getElementById('q-counter').textContent     = `Pregunta ${currentQ + 1} de ${quizPreguntas.length}`;
  document.getElementById('q-prog-fill').style.width   = `${((currentQ + 1) / quizPreguntas.length) * 100}%`;
  document.getElementById('btn-check').style.display   = 'inline-flex';
  document.getElementById('btn-next').style.display    = 'none';
  selected = null; answered = false;

  const area = document.getElementById('quiz-area');
  area.style.display = 'block';
  area.innerHTML = `
    <div class="question-card">
      <div class="q-number">Pregunta ${currentQ + 1}</div>
      <div class="q-text">${q.pregunta}</div>
      <div class="options-list">
        ${opts.map((o, i) => `
          <div class="option" id="opt-${i}" onclick="selectOption(${i})">
            <div class="option-circle">${String.fromCharCode(65 + i)}</div>${o}
          </div>`).join('')}
      </div>
      <div class="feedback" id="feedback"></div>
    </div>`;
}

function selectOption(i) {
  if (answered) return;
  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  document.getElementById(`opt-${i}`)?.classList.add('selected');
  selected = i;
}

function checkAnswer() {
  if (selected === null) return;
  answered = true;
  const q    = quizPreguntas[currentQ];
  const opts = typeof q.opciones === 'string' ? JSON.parse(q.opciones) : q.opciones;
  const fb   = document.getElementById('feedback');

  document.querySelectorAll('.option').forEach((o, i) => {
    if (i === q.correcta) o.classList.add('correct');
    else if (i === selected && i !== q.correcta) o.classList.add('wrong');
  });

  if (selected === q.correcta) {
    score++;
    fb.className = 'feedback show correct-fb';
    fb.innerHTML = `<i class="ti ti-check"></i> ¡Correcto! ${q.explicacion || ''}`;
  } else {
    fb.className = 'feedback show wrong-fb';
    fb.innerHTML = `<i class="ti ti-x"></i> Incorrecto. Respuesta: <strong>${opts[q.correcta]}</strong>. ${q.explicacion || ''}`;
  }

  document.getElementById('btn-check').style.display = 'none';
  if (currentQ < quizPreguntas.length - 1) {
    document.getElementById('btn-next').style.display = 'inline-flex';
  } else {
    setTimeout(showResult, 600);
  }
}

function nextQuestion() { currentQ++; renderQuiz(); }

async function showResult() {
  document.getElementById('quiz-nav').style.display  = 'none';
  document.getElementById('quiz-area').style.display = 'none';
  const resultEl = document.getElementById('quiz-result');
  resultEl.style.display = 'block';

  const pct = Math.round((score / quizPreguntas.length) * 100);
  document.getElementById('result-score').textContent = `${score} de ${quizPreguntas.length} correctas — ${pct}%`;
  document.getElementById('result-msg').textContent   = pct >= 80
    ? '¡Excelente! Superaste el 80% — se generó tu certificado automáticamente.'
    : 'Sigue practicando — necesitas al menos 80% para obtener el certificado.';

  if (currentUser && currentCursoId) {
    try {
      await guardarResultado(currentUser.id, currentCursoId, score, quizPreguntas.length);
    } catch (e) { console.warn('Error guardando resultado:', e); }
  }
}

function resetQuiz() {
  currentQ = 0; score = 0; selected = null; answered = false;
  document.getElementById('quiz-nav').style.display  = 'flex';
  document.getElementById('quiz-result').style.display = 'none';
  renderQuiz();
}

// ── PROGRESO ──────────────────────────────────
async function cargarProgreso() {
  if (!currentUser) return;
  const container = document.getElementById('progress-modulos');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-sec); font-size:14px;">Cargando...</p>';

  try {
    const cursos = await getCursos();
    container.innerHTML = '';

    for (const curso of cursos) {
      const pct  = await calcularProgresoCurso(currentUser.id, curso.id);
      const lecs = await getLecciones(curso.id);
      const card = document.createElement('div');
      card.className = 'module-progress-card';
      card.innerHTML = `
        <div class="mp-header">
          <div>
            <span class="course-tag tag-${curso.tag}" style="margin-bottom:4px; display:inline-block;">${curso.tag.toUpperCase()}</span>
            <div class="mp-title">${curso.titulo}</div>
          </div>
          <div class="mp-pct">${pct}%</div>
        </div>
        <div class="mp-bar"><div class="mp-fill" style="width:${pct}%; background:${barColor(curso.tag)};"></div></div>
        <div class="mp-lessons">
          ${lecs.map(l => `
            <div class="mp-lesson-row">
              <div class="dot ${l.estado === 'done' ? 'dot-done' : l.estado === 'current' ? 'dot-prog' : 'dot-pend'}"></div>
              ${l.titulo}
            </div>`).join('')}
        </div>`;
      container.appendChild(card);
    }

    // Historial de quizzes
    const historial = await getHistorialQuiz(currentUser.id);
    const actEl     = document.getElementById('activity-list');
    if (actEl && historial.length) {
      actEl.innerHTML = historial.map(r => `
        <div class="activity-item">
          <div class="activity-icon ai-${r.cursos?.tag === 'sql' ? 'blue' : r.cursos?.tag === 'erp' ? 'teal' : 'amber'}">
            <i class="ti ti-clipboard-check"></i>
          </div>
          <div class="activity-text">
            <div class="activity-name">Quiz: ${r.cursos?.titulo || 'Curso'} — ${r.porcentaje}%</div>
            <div class="activity-time">${new Date(r.created_at).toLocaleDateString('es-MX')}</div>
          </div>
          <span class="activity-badge ${r.aprobado ? 'badge-done' : 'badge-prog'}">${r.aprobado ? 'Aprobado' : 'Repaso'}</span>
        </div>`).join('');
    }
  } catch (e) {
    container.innerHTML = '<p style="color:var(--text-sec)">Error cargando progreso.</p>';
  }
}

// ── CERTIFICADOS ──────────────────────────────
async function cargarCertificados() {
  if (!currentUser) return;
  const container = document.getElementById('cert-container');
  if (!container) return;
  container.innerHTML = '<p style="color:var(--text-sec); font-size:14px; text-align:center; padding:32px;">Cargando...</p>';

  try {
    const certs  = await getCertificados(currentUser.id);
    const nombre = currentPerfil?.nombre || currentUser.email;

    if (!certs.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:48px; color:var(--text-sec);">
          <div style="font-size:40px; margin-bottom:12px;">🎓</div>
          <div style="font-size:16px; font-weight:500; margin-bottom:6px;">Aún no tienes certificados</div>
          <div style="font-size:14px;">Completa un quiz con 80% o más para obtener tu primer certificado.</div>
        </div>`;
      return;
    }

    container.innerHTML = certs.map(cert => `
      <div class="certificate" style="margin-bottom:32px;">
        <div class="cert-accent"></div>
        <div class="cert-logo-big">IntelisisQ Academy</div>
        <div class="cert-headline">Certifica que</div>
        <div class="cert-name">${nombre}</div>
        <div class="cert-headline" style="margin-top:4px;">ha completado satisfactoriamente el curso</div>
        <div class="cert-course">${cert.cursos?.titulo || 'Curso'}</div>
        <div class="cert-divider"></div>
        <div class="cert-footer">
          <div class="cert-sig">
            <div class="cert-sig-line"></div>
            <div class="cert-sig-name">Director Académico</div>
            <div class="cert-sig-role">IntelisisQ Academy</div>
          </div>
          <div class="cert-seal"><i class="ti ti-rosette-discount-check"></i></div>
          <div class="cert-sig">
            <div class="cert-sig-line"></div>
            <div class="cert-sig-name">${new Date(cert.emitido_at).toLocaleDateString('es-MX', { year:'numeric', month:'long', day:'numeric' })}</div>
            <div class="cert-sig-role">Fecha de emisión</div>
          </div>
        </div>
        <div class="cert-id">ID: ${cert.folio} · intelisisq.academy/verify</div>
      </div>`).join('');
  } catch (e) {
    container.innerHTML = '<p style="color:var(--text-sec)">Error cargando certificados.</p>';
  }
}

// ── Helpers ───────────────────────────────────
function setLoading(id, loading) {
  const el = document.getElementById(id);
  if (el) el.style.display = loading ? 'block' : 'none';
}
