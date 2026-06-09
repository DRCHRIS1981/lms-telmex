// =============================================
// supabase.js — Configuración de Supabase
// =============================================

const SUPABASE_URL  = 'https://dbqaphctqzcoyleuktyt.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRicWFwaGN0cXpjb3lsZXVrdHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMjY1ODAsImV4cCI6MjA5NjYwMjU4MH0.loE11xz5r3KR_RophyXkBkBmYWGd0x5KfA9dYX7Z83E';

// Cliente Supabase (cargado desde CDN en index.html)
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Auth helpers ──────────────────────────────

async function registrar(nombre, email, password) {
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { nombre } }
  });
  if (error) throw error;
  return data;
}

async function login(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

async function logout() {
  await sb.auth.signOut();
}

async function getUser() {
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

async function getPerfil(userId) {
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

// ── Cursos ────────────────────────────────────

async function getCursos() {
  const { data, error } = await sb
    .from('cursos')
    .select('*')
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return data;
}

// ── Lecciones ─────────────────────────────────

async function getLecciones(cursoId) {
  const { data, error } = await sb
    .from('lecciones')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return data;
}

// ── Progreso ──────────────────────────────────

async function getProgreso(userId) {
  const { data, error } = await sb
    .from('progreso')
    .select('*, lecciones(curso_id)')
    .eq('user_id', userId);
  if (error) return [];
  return data;
}

async function marcarLeccionCompleta(userId, leccionId) {
  const { error } = await sb
    .from('progreso')
    .upsert({
      user_id: userId,
      leccion_id: leccionId,
      completada: true,
      porcentaje: 100,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,leccion_id' });
  if (error) throw error;
}

async function calcularProgresoCurso(userId, cursoId) {
  const lecciones = await getLecciones(cursoId);
  if (!lecciones.length) return 0;
  const { data } = await sb
    .from('progreso')
    .select('leccion_id')
    .eq('user_id', userId)
    .eq('completada', true)
    .in('leccion_id', lecciones.map(l => l.id));
  return Math.round(((data?.length || 0) / lecciones.length) * 100);
}

// ── Preguntas / Quiz ──────────────────────────

async function getPreguntas(cursoId) {
  const { data, error } = await sb
    .from('preguntas')
    .select('*')
    .eq('curso_id', cursoId)
    .eq('activo', true)
    .order('orden');
  if (error) throw error;
  return data;
}

async function guardarResultado(userId, cursoId, puntaje, total) {
  const porcentaje = Math.round((puntaje / total) * 100);
  const aprobado   = porcentaje >= 80;

  const { error } = await sb
    .from('resultados_quiz')
    .insert({ user_id: userId, curso_id: cursoId, puntaje, total, porcentaje, aprobado });
  if (error) throw error;

  // Si aprobó, generar certificado automáticamente
  if (aprobado) await generarCertificado(userId, cursoId);

  return { porcentaje, aprobado };
}

// ── Certificados ──────────────────────────────

async function generarCertificado(userId, cursoId) {
  const folio = `IQ-${new Date().getFullYear()}-${cursoId}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
  const { error } = await sb
    .from('certificados')
    .upsert({ user_id: userId, curso_id: cursoId, folio }, { onConflict: 'user_id,curso_id' });
  if (error) console.warn('Certificado ya existente o error:', error.message);
}

async function getCertificados(userId) {
  const { data, error } = await sb
    .from('certificados')
    .select('*, cursos(titulo, tag, emoji)')
    .eq('user_id', userId)
    .order('emitido_at', { ascending: false });
  if (error) return [];
  return data;
}

async function getHistorialQuiz(userId) {
  const { data, error } = await sb
    .from('resultados_quiz')
    .select('*, cursos(titulo, tag)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (error) return [];
  return data;
}
