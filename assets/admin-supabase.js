// =============================================
// admin-supabase.js — Helpers para panel admin
// =============================================

const SUPABASE_URL  = 'https://dbqaphctqzcoyleuktyt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWFwaGN0cXpjb3lsZXVrdHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjY1ODAsImV4cCI6MjA5NjYwMjU4MH0.loE11xz5r3KR_RophyXkBkBmYWGd0x5KfA9dYX7Z83E';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth ──────────────────────────────────────
async function adminLogin(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Usar función segura que no depende de RLS
  const { data: rolData } = await sb.rpc('get_my_rol');
  if (rolData !== 'admin') {
    await sb.auth.signOut();
    throw new Error('No tienes permisos de administrador.');
  }
  return data;
}

async function adminLogout() { await sb.auth.signOut(); }

async function getAdminUser() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data: perfil } = await sb.from('profiles').select('*').eq('id', user.id).single();
  if (!perfil || perfil.rol !== 'admin') return null;
  return { ...user, perfil };
}

// ── Stats ─────────────────────────────────────
async function getStats() {
  const { data } = await sb.from('admin_stats').select('*').single();
  return data || {};
}

// ── Alumnos ───────────────────────────────────
async function getAlumnos() {
  const { data, error } = await sb.from('admin_alumnos').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function getAlumnoDetalle(userId) {
  const { data: perfil } = await sb.from('profiles').select('*').eq('id', userId).single();
  const { data: quizzes } = await sb.from('resultados_quiz')
    .select('*, cursos(titulo)').eq('user_id', userId).order('created_at', { ascending: false });
  const { data: certs } = await sb.from('certificados')
    .select('*, cursos(titulo)').eq('user_id', userId);
  const { data: progreso } = await sb.from('progreso')
    .select('*, lecciones(titulo, curso_id)').eq('user_id', userId).eq('completada', true);
  return { perfil, quizzes: quizzes || [], certs: certs || [], progreso: progreso || [] };
}

async function darDeBajaAlumno(userId) {
  // Cambia rol a 'inactivo' en vez de borrar
  const { error } = await sb.from('profiles').update({ rol: 'inactivo' }).eq('id', userId);
  if (error) throw error;
}

async function reactivarAlumno(userId) {
  const { error } = await sb.from('profiles').update({ rol: 'alumno' }).eq('id', userId);
  if (error) throw error;
}

async function editarCalificacion(resultadoId, nuevoPorcentaje) {
  const aprobado = nuevoPorcentaje >= 80;
  const { error } = await sb.from('resultados_quiz')
    .update({ porcentaje: nuevoPorcentaje, aprobado })
    .eq('id', resultadoId);
  if (error) throw error;
  // Si aprobó, generar certificado
  if (aprobado) {
    const { data: res } = await sb.from('resultados_quiz').select('user_id, curso_id').eq('id', resultadoId).single();
    if (res) await emitirCertificado(res.user_id, res.curso_id);
  }
}

// ── Cursos ────────────────────────────────────
async function getCursos() {
  const { data, error } = await sb
    .from('cursos')
    .select('*')
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return data || [];
}

async function crearCurso(datos) {
  const { data, error } = await sb.from('cursos').insert(datos).select().single();
  if (error) throw error;
  return data;
}

async function editarCurso(id, datos) {
  const { error } = await sb.from('cursos').update(datos).eq('id', id);
  if (error) throw error;
}

async function eliminarCurso(id) {
  const { error } = await sb.from('cursos').update({ activo: false }).eq('id', id);
  if (error) throw error;
}

// ── Lecciones ─────────────────────────────────
async function getLecciones(cursoId) {
  const { data, error } = await sb.from('lecciones')
    .select('*').eq('curso_id', cursoId).order('orden');
  if (error) throw error;
  return data || [];
}

async function crearLeccion(datos) {
  const { data, error } = await sb.from('lecciones').insert(datos).select().single();
  if (error) throw error;
  return data;
}

async function editarLeccion(id, datos) {
  const { error } = await sb.from('lecciones').update(datos).eq('id', id);
  if (error) throw error;
}

async function eliminarLeccion(id) {
  const { error } = await sb.from('lecciones').update({ activo: false }).eq('id', id);
  if (error) throw error;
}

// ── Preguntas ─────────────────────────────────
async function getPreguntas(cursoId) {
  const { data, error } = await sb.from('preguntas')
    .select('*').eq('curso_id', cursoId).order('orden');
  if (error) throw error;
  return data || [];
}

async function crearPregunta(datos) {
  // opciones debe ser array
  const { data, error } = await sb.from('preguntas').insert({
    ...datos,
    opciones: typeof datos.opciones === 'string' ? JSON.parse(datos.opciones) : datos.opciones
  }).select().single();
  if (error) throw error;
  return data;
}

async function editarPregunta(id, datos) {
  const { error } = await sb.from('preguntas').update({
    ...datos,
    opciones: typeof datos.opciones === 'string' ? JSON.parse(datos.opciones) : datos.opciones
  }).eq('id', id);
  if (error) throw error;
}

async function eliminarPregunta(id) {
  const { error } = await sb.from('preguntas').update({ activo: false }).eq('id', id);
  if (error) throw error;
}

// ── Certificados ──────────────────────────────
async function emitirCertificado(userId, cursoId) {
  const folio = `TX-${new Date().getFullYear()}-${cursoId}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
  const { error } = await sb.from('certificados')
    .upsert({ user_id: userId, curso_id: cursoId, folio }, { onConflict: 'user_id,curso_id' });
  if (error) console.warn('Certificado:', error.message);
}

async function revocarCertificado(certId) {
  const { error } = await sb.from('certificados').delete().eq('id', certId);
  if (error) throw error;
}

async function getCertificadosTodos() {
  const { data, error } = await sb.from('certificados')
    .select('*, profiles(nombre, email), cursos(titulo)')
    .order('emitido_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
