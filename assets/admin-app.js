// =============================================
// admin-app.js — Lógica del panel de admin
// =============================================

let adminUser   = null;
let cursosCache = [];
let seccionActiva = 'dashboard';

// ── INIT ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  sb.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const u = await getAdminUser();
      if (u) {
        adminUser = u;
        mostrarPanel();
        document.getElementById('admin-nombre').textContent = u.perfil?.nombre || u.email;
        cargarSeccion('dashboard');
      } else {
        mostrarLogin('No tienes permisos de administrador.');
        await sb.auth.signOut();
      }
    } else {
      adminUser = null;
      mostrarLogin();
    }
  });
});

function mostrarLogin(error = '') {
  document.getElementById('admin-login').style.display  = 'flex';
  document.getElementById('admin-panel').style.display  = 'none';
  if (error) {
    const el = document.getElementById('login-error');
    el.textContent  = error;
    el.style.display = 'block';
  }
}

function mostrarPanel() {
  document.getElementById('admin-login').style.display  = 'none';
  document.getElementById('admin-panel').style.display  = 'grid';
}

async function handleAdminLogin() {
  const email    = document.getElementById('a-email').value.trim();
  const password = document.getElementById('a-password').value;
  const errEl    = document.getElementById('login-error');
  errEl.style.display = 'none';
  if (!email || !password) { errEl.textContent = 'Completa todos los campos.'; errEl.style.display = 'block'; return; }
  const btn = document.getElementById('btn-admin-login');
  btn.disabled = true; btn.textContent = 'Verificando...';
  try {
    await adminLogin(email, password);
  } catch (e) {
    errEl.textContent  = e.message || 'Credenciales incorrectas.';
    errEl.style.display = 'block';
    btn.disabled = false; btn.textContent = 'Entrar al panel';
  }
}

async function handleAdminLogout() {
  await adminLogout();
}

// ── NAVEGACIÓN ────────────────────────────────
function cargarSeccion(nombre) {
  seccionActiva = nombre;
  document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.admin-section').forEach(s => s.style.display = 'none');
  document.getElementById(`nav-${nombre}`)?.classList.add('active');
  document.getElementById(`sec-${nombre}`).style.display = 'block';

  if (nombre === 'dashboard')   cargarDashboard();
  if (nombre === 'alumnos')     cargarAlumnos();
  if (nombre === 'cursos')      cargarCursos();
  if (nombre === 'certificados') cargarCertificados();
}

// ── DASHBOARD ─────────────────────────────────
async function cargarDashboard() {
  try {
    const stats = await getStats();
    document.getElementById('st-alumnos').textContent    = stats.total_alumnos    || 0;
    document.getElementById('st-cursos').textContent     = stats.total_cursos     || 0;
    document.getElementById('st-quizzes').textContent    = stats.total_quizzes    || 0;
    document.getElementById('st-certs').textContent      = stats.total_certificados || 0;
    document.getElementById('st-promedio').textContent   = (stats.promedio_global  || 0) + '%';
    document.getElementById('st-lecciones').textContent  = stats.total_lecciones  || 0;
  } catch (e) { console.error(e); }
}

// ── ALUMNOS ───────────────────────────────────
async function cargarAlumnos(filtro = '') {
  const tbody = document.getElementById('tabla-alumnos');
  tbody.innerHTML = '<tr><td colspan="7" style="color:#888; padding:16px;">Cargando...</td></tr>';
  try {
    let alumnos = await getAlumnos();
    if (filtro) alumnos = alumnos.filter(a =>
      a.nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
      a.email?.toLowerCase().includes(filtro.toLowerCase())
    );
    if (!alumnos.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:#888; padding:16px;">Sin resultados.</td></tr>';
      return;
    }
    tbody.innerHTML = alumnos.map(a => `
      <tr>
        <td><strong>${a.nombre || '—'}</strong></td>
        <td>${a.email}</td>
        <td>${a.lecciones_completadas}</td>
        <td>${a.quizzes_tomados}</td>
        <td>${a.promedio_quiz}%</td>
        <td>${a.certificados}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-table btn-info" onclick="verAlumno('${a.id}')">Ver</button>
            <button class="btn-table btn-warn" onclick="cambiarRolAlumno('${a.id}', '${a.rol}')">
              ${a.rol === 'inactivo' ? 'Activar' : 'Dar de baja'}
            </button>
          </div>
        </td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="7" style="color:#c00;">${e.message}</td></tr>`;
  }
}

async function cambiarRolAlumno(id, rolActual) {
  if (!confirm(rolActual === 'inactivo' ? '¿Reactivar este alumno?' : '¿Dar de baja este alumno?')) return;
  try {
    if (rolActual === 'inactivo') await reactivarAlumno(id);
    else await darDeBajaAlumno(id);
    cargarAlumnos();
  } catch (e) { alert('Error: ' + e.message); }
}

async function verAlumno(id) {
  const modal = document.getElementById('modal-alumno');
  const body  = document.getElementById('modal-alumno-body');
  body.innerHTML = '<p style="color:#888;">Cargando...</p>';
  modal.style.display = 'flex';
  try {
    const { perfil, quizzes, certs, progreso } = await getAlumnoDetalle(id);
    body.innerHTML = `
      <div class="detalle-header">
        <div class="detalle-avatar">${(perfil?.nombre || 'U').charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-size:18px; font-weight:600;">${perfil?.nombre || '—'}</div>
          <div style="font-size:13px; color:#888;">${perfil?.email}</div>
          <div style="font-size:12px; color:#aaa;">Registrado: ${new Date(perfil?.created_at).toLocaleDateString('es-MX')}</div>
        </div>
      </div>

      <div class="detalle-section">📚 Lecciones completadas: <strong>${progreso.length}</strong></div>

      <div class="detalle-section">📝 Historial de quizzes</div>
      ${quizzes.length ? `
        <table class="admin-table" style="margin-bottom:16px;">
          <thead><tr><th>Curso</th><th>Puntaje</th><th>%</th><th>Estado</th><th>Editar</th></tr></thead>
          <tbody>
            ${quizzes.map(q => `
              <tr>
                <td>${q.cursos?.titulo || '—'}</td>
                <td>${q.puntaje}/${q.total}</td>
                <td>
                  <input type="number" min="0" max="100" value="${q.porcentaje}"
                    id="cal-${q.id}" style="width:60px; padding:3px 6px; border:1px solid #ddd; border-radius:4px; font-size:13px;" />
                </td>
                <td><span class="badge-${q.aprobado ? 'green' : 'red'}">${q.aprobado ? 'Aprobado' : 'Repaso'}</span></td>
                <td><button class="btn-table btn-info" onclick="guardarCalificacion(${q.id})">Guardar</button></td>
              </tr>`).join('')}
          </tbody>
        </table>` : '<p style="color:#888; font-size:13px;">Sin quizzes tomados.</p>'}

      <div class="detalle-section">🏆 Certificados: <strong>${certs.length}</strong></div>
      ${certs.map(c => `
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f0f0f0; font-size:13px;">
          <span>${c.cursos?.titulo} — <code>${c.folio}</code></span>
          <button class="btn-table btn-danger" onclick="confirmarRevocarCert(${c.id})">Revocar</button>
        </div>`).join('')}`;
  } catch (e) {
    body.innerHTML = `<p style="color:#c00;">${e.message}</p>`;
  }
}

async function guardarCalificacion(resultadoId) {
  const input = document.getElementById(`cal-${resultadoId}`);
  const val   = parseInt(input.value);
  if (isNaN(val) || val < 0 || val > 100) return alert('Valor entre 0 y 100.');
  try {
    await editarCalificacion(resultadoId, val);
    alert('Calificación actualizada.');
  } catch (e) { alert('Error: ' + e.message); }
}

async function confirmarRevocarCert(certId) {
  if (!confirm('¿Revocar este certificado? Esta acción no se puede deshacer.')) return;
  try {
    await revocarCertificado(certId);
    alert('Certificado revocado.');
    document.getElementById('modal-alumno').style.display = 'none';
  } catch (e) { alert('Error: ' + e.message); }
}

function cerrarModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ── CURSOS ────────────────────────────────────
async function cargarCursos() {
  cursosCache = await getCursos();
  const lista = document.getElementById('lista-cursos');
  lista.innerHTML = '';
  cursosCache.forEach(c => {
    const div = document.createElement('div');
    div.className = 'curso-card-admin';
    div.innerHTML = `
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:12px;">
        <div style="font-size:28px;">${c.emoji}</div>
        <div style="flex:1;">
          <div style="font-weight:600; font-size:15px;">${c.titulo}</div>
          <span class="tag-pill tag-${c.tag}">${c.tag.toUpperCase()}</span>
          <span style="font-size:12px; color:#888; margin-left:8px;">${c.duracion}</span>
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-table btn-info" onclick="abrirEditarCurso(${c.id})">Editar</button>
          <button class="btn-table btn-warn" onclick="abrirLecciones(${c.id})">Lecciones</button>
          <button class="btn-table btn-warn" onclick="abrirPreguntas(${c.id})">Quiz</button>
          <button class="btn-table btn-danger" onclick="confirmarEliminarCurso(${c.id})">Eliminar</button>
        </div>
      </div>
      <div style="font-size:13px; color:#888;">${c.descripcion || ''}</div>`;
    lista.appendChild(div);
  });
}

function abrirNuevoCurso() {
  document.getElementById('form-curso-titulo').textContent = 'Nuevo curso';
  document.getElementById('curso-id').value       = '';
  document.getElementById('curso-titulo').value   = '';
  document.getElementById('curso-desc').value     = '';
  document.getElementById('curso-tag').value      = 'sql';
  document.getElementById('curso-emoji').value    = '📚';
  document.getElementById('curso-duracion').value = '';
  document.getElementById('curso-orden').value    = '';
  document.getElementById('modal-curso').style.display = 'flex';
}

function abrirEditarCurso(id) {
  const c = cursosCache.find(x => x.id === id);
  if (!c) return;
  document.getElementById('form-curso-titulo').textContent = 'Editar curso';
  document.getElementById('curso-id').value       = c.id;
  document.getElementById('curso-titulo').value   = c.titulo;
  document.getElementById('curso-desc').value     = c.descripcion || '';
  document.getElementById('curso-tag').value      = c.tag;
  document.getElementById('curso-emoji').value    = c.emoji;
  document.getElementById('curso-duracion').value = c.duracion;
  document.getElementById('curso-orden').value    = c.orden;
  document.getElementById('modal-curso').style.display = 'flex';
}

async function guardarCurso() {
  const id     = document.getElementById('curso-id').value;
  const datos  = {
    titulo:      document.getElementById('curso-titulo').value.trim(),
    descripcion: document.getElementById('curso-desc').value.trim(),
    tag:         document.getElementById('curso-tag').value,
    emoji:       document.getElementById('curso-emoji').value.trim() || '📚',
    duracion:    document.getElementById('curso-duracion').value.trim(),
    orden:       parseInt(document.getElementById('curso-orden').value) || 0,
    activo:      true
  };
  if (!datos.titulo) return alert('El título es obligatorio.');
  try {
    if (!datos.slug) datos.slug = datos.titulo.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (id) await editarCurso(parseInt(id), datos);
    else    await crearCurso(datos);
    cerrarModal('modal-curso');
    cargarCursos();
  } catch (e) { alert('Error: ' + e.message); }
}

async function confirmarEliminarCurso(id) {
  if (!confirm('¿Eliminar este curso? Las lecciones y preguntas asociadas quedarán inactivas.')) return;
  try { await eliminarCurso(id); cargarCursos(); }
  catch (e) { alert('Error: ' + e.message); }
}

// ── LECCIONES ─────────────────────────────────
let leccionesCursoId = null;
let leccionesCache   = [];

async function abrirLecciones(cursoId) {
  leccionesCursoId = cursoId;
  const curso = cursosCache.find(c => c.id === cursoId);
  document.getElementById('lecciones-curso-nombre').textContent = curso?.titulo || '';
  document.getElementById('modal-lecciones').style.display = 'flex';
  await cargarListaLecciones();
}

async function cargarListaLecciones() {
  leccionesCache = await getLecciones(leccionesCursoId);
  const lista = document.getElementById('lista-lecciones');
  lista.innerHTML = leccionesCache.length
    ? leccionesCache.map(l => `
        <div class="leccion-row">
          <div style="flex:1;">
            <strong>${l.orden}. ${l.titulo}</strong>
            <span style="font-size:12px; color:#888; margin-left:8px;">${l.duracion} · ${l.estado}</span>
          </div>
          <div style="display:flex; gap:6px;">
            <button class="btn-table btn-info" onclick="abrirEditarLeccion(${l.id})">Editar</button>
            <button class="btn-table btn-danger" onclick="confirmarEliminarLeccion(${l.id})">Eliminar</button>
          </div>
        </div>`).join('')
    : '<p style="color:#888; font-size:13px;">Sin lecciones. Agrega la primera.</p>';
}

function abrirNuevaLeccion() {
  document.getElementById('lec-id').value      = '';
  document.getElementById('lec-titulo').value  = '';
  document.getElementById('lec-cuerpo').value  = '';
  document.getElementById('lec-codigo').value  = '';
  document.getElementById('lec-extra').value   = '';
  document.getElementById('lec-dur').value     = '15 min';
  document.getElementById('lec-estado').value  = 'locked';
  document.getElementById('lec-orden').value   = leccionesCache.length + 1;
  document.getElementById('modal-leccion').style.display = 'flex';
}

function abrirEditarLeccion(id) {
  const l = leccionesCache.find(x => x.id === id);
  if (!l) return;
  document.getElementById('lec-id').value      = l.id;
  document.getElementById('lec-titulo').value  = l.titulo;
  document.getElementById('lec-cuerpo').value  = l.cuerpo || '';
  document.getElementById('lec-codigo').value  = l.codigo || '';
  document.getElementById('lec-extra').value   = l.nota_extra || '';
  document.getElementById('lec-dur').value     = l.duracion;
  document.getElementById('lec-estado').value  = l.estado;
  document.getElementById('lec-orden').value   = l.orden;
  document.getElementById('modal-leccion').style.display = 'flex';
}

async function guardarLeccion() {
  const id    = document.getElementById('lec-id').value;
  const datos = {
    curso_id:   leccionesCursoId,
    titulo:     document.getElementById('lec-titulo').value.trim(),
    cuerpo:     document.getElementById('lec-cuerpo').value.trim(),
    codigo:     document.getElementById('lec-codigo').value.trim(),
    nota_extra: document.getElementById('lec-extra').value.trim(),
    duracion:   document.getElementById('lec-dur').value.trim() || '10 min',
    estado:     document.getElementById('lec-estado').value,
    orden:      parseInt(document.getElementById('lec-orden').value) || 1,
    activo:     true
  };
  if (!datos.titulo) return alert('El título es obligatorio.');
  try {
    if (id) await editarLeccion(parseInt(id), datos);
    else    await crearLeccion(datos);
    cerrarModal('modal-leccion');
    cargarListaLecciones();
  } catch (e) { alert('Error: ' + e.message); }
}

async function confirmarEliminarLeccion(id) {
  if (!confirm('¿Eliminar esta lección?')) return;
  try { await eliminarLeccion(id); cargarListaLecciones(); }
  catch (e) { alert('Error: ' + e.message); }
}

// ── PREGUNTAS ─────────────────────────────────
let preguntasCursoId = null;
let preguntasCache   = [];

async function abrirPreguntas(cursoId) {
  preguntasCursoId = cursoId;
  const curso = cursosCache.find(c => c.id === cursoId);
  document.getElementById('preguntas-curso-nombre').textContent = curso?.titulo || '';
  document.getElementById('modal-preguntas').style.display = 'flex';
  await cargarListaPreguntas();
}

async function cargarListaPreguntas() {
  preguntasCache = await getPreguntas(preguntasCursoId);
  const lista = document.getElementById('lista-preguntas');
  lista.innerHTML = preguntasCache.length
    ? preguntasCache.map(p => {
        const opts = typeof p.opciones === 'string' ? JSON.parse(p.opciones) : p.opciones;
        return `
          <div class="leccion-row">
            <div style="flex:1;">
              <strong>${p.orden}. ${p.pregunta}</strong>
              <div style="font-size:12px; color:#888; margin-top:2px;">✅ ${opts[p.correcta]}</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn-table btn-info" onclick="abrirEditarPregunta(${p.id})">Editar</button>
              <button class="btn-table btn-danger" onclick="confirmarEliminarPregunta(${p.id})">Eliminar</button>
            </div>
          </div>`}).join('')
    : '<p style="color:#888; font-size:13px;">Sin preguntas. Agrega la primera.</p>';
}

function abrirNuevaPregunta() {
  document.getElementById('preg-id').value          = '';
  document.getElementById('preg-texto').value       = '';
  document.getElementById('preg-opciones').value    = '';
  document.getElementById('preg-correcta').value    = '0';
  document.getElementById('preg-explic').value      = '';
  document.getElementById('preg-orden').value       = preguntasCache.length + 1;
  document.getElementById('modal-pregunta').style.display = 'flex';
}

function abrirEditarPregunta(id) {
  const p = preguntasCache.find(x => x.id === id);
  if (!p) return;
  const opts = typeof p.opciones === 'string' ? JSON.parse(p.opciones) : p.opciones;
  document.getElementById('preg-id').value       = p.id;
  document.getElementById('preg-texto').value    = p.pregunta;
  document.getElementById('preg-opciones').value = opts.join('\n');
  document.getElementById('preg-correcta').value = p.correcta;
  document.getElementById('preg-explic').value   = p.explicacion || '';
  document.getElementById('preg-orden').value    = p.orden;
  document.getElementById('modal-pregunta').style.display = 'flex';
}

async function guardarPregunta() {
  const id     = document.getElementById('preg-id').value;
  const optsRaw = document.getElementById('preg-opciones').value.trim().split('\n').map(o => o.trim()).filter(Boolean);
  if (optsRaw.length < 2) return alert('Agrega al menos 2 opciones (una por línea).');
  const correcta = parseInt(document.getElementById('preg-correcta').value);
  if (isNaN(correcta) || correcta < 0 || correcta >= optsRaw.length)
    return alert(`La respuesta correcta debe ser un número entre 0 y ${optsRaw.length - 1}.`);
  const datos = {
    curso_id:    preguntasCursoId,
    pregunta:    document.getElementById('preg-texto').value.trim(),
    opciones:    optsRaw,
    correcta,
    explicacion: document.getElementById('preg-explic').value.trim(),
    orden:       parseInt(document.getElementById('preg-orden').value) || 1,
    activo:      true
  };
  if (!datos.pregunta) return alert('La pregunta es obligatoria.');
  try {
    if (id) await editarPregunta(parseInt(id), datos);
    else    await crearPregunta(datos);
    cerrarModal('modal-pregunta');
    cargarListaPreguntas();
  } catch (e) { alert('Error: ' + e.message); }
}

async function confirmarEliminarPregunta(id) {
  if (!confirm('¿Eliminar esta pregunta?')) return;
  try { await eliminarPregunta(id); cargarListaPreguntas(); }
  catch (e) { alert('Error: ' + e.message); }
}

// ── CERTIFICADOS ──────────────────────────────
async function cargarCertificados() {
  const tbody = document.getElementById('tabla-certs');
  tbody.innerHTML = '<tr><td colspan="5" style="color:#888; padding:16px;">Cargando...</td></tr>';
  try {
    const certs = await getCertificadosTodos();
    if (!certs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:#888; padding:16px;">Sin certificados emitidos.</td></tr>';
      return;
    }
    tbody.innerHTML = certs.map(c => `
      <tr>
        <td>${c.profiles?.nombre || '—'}</td>
        <td>${c.profiles?.email || '—'}</td>
        <td>${c.cursos?.titulo || '—'}</td>
        <td><code style="font-size:11px;">${c.folio}</code></td>
        <td>${new Date(c.emitido_at).toLocaleDateString('es-MX')}</td>
        <td><button class="btn-table btn-danger" onclick="confirmarRevocarCert(${c.id})">Revocar</button></td>
      </tr>`).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:#c00;">${e.message}</td></tr>`;
  }
}
