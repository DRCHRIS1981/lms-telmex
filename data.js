// =============================================
// DATA: Lecciones y preguntas del LMS
// Para agregar contenido, edita estos arreglos
// =============================================

const lessons = [
  // ── SQL FUNDAMENTOS (índices 0–3) ──────────────────────────────────────────
  {
    title: "SELECT básico y filtros WHERE",
    module: "SQL Fundamentos",
    tag: "sql",
    dur: "12 min",
    status: "done",
    body: "La instrucción SELECT es la base de todas las consultas en SQL. Permite extraer datos de una o más tablas aplicando condiciones con WHERE, ordenarlos con ORDER BY y limitar resultados con TOP o LIMIT.",
    code: '<span class="cm">-- Consulta básica en Intelisis</span>\n<span class="kw">SELECT</span> cve_cliente, nom_cliente, saldo\n<span class="kw">FROM</span>   intelisis.clientes\n<span class="kw">WHERE</span>  activo = <span class="str">\'S\'</span>\n  <span class="kw">AND</span>  saldo > 0\n<span class="kw">ORDER BY</span> saldo <span class="kw">DESC</span>;',
    extra: "En Intelisis las tablas de clientes, proveedores y movimientos están normalizadas. Usa alias de columna para hacer los reportes exportados a Excel más legibles."
  },
  {
    title: "JOINs: combinando tablas",
    module: "SQL Fundamentos",
    tag: "sql",
    dur: "18 min",
    status: "done",
    body: "Los JOINs permiten combinar filas de dos o más tablas en base a una columna relacionada. INNER JOIN devuelve solo las filas con coincidencia en ambas tablas; LEFT JOIN conserva todas las filas de la izquierda.",
    code: '<span class="cm">-- JOIN entre pedidos y clientes</span>\n<span class="kw">SELECT</span> p.folio, c.nom_cliente, p.total\n<span class="kw">FROM</span>   intelisis.pedidos p\n<span class="kw">INNER JOIN</span> intelisis.clientes c\n       <span class="kw">ON</span> p.cve_cliente = c.cve_cliente\n<span class="kw">WHERE</span>  p.estatus = <span class="str">\'Cerrado\'</span>;',
    extra: "Los JOINs son fundamentales para cruzar información entre módulos de Intelisis: ventas con inventario, CxC con contabilidad, etc."
  },
  {
    title: "Subconsultas y CTEs",
    module: "SQL Fundamentos",
    tag: "sql",
    dur: "20 min",
    status: "done",
    body: "Una subconsulta es una consulta dentro de otra. Los CTEs (Common Table Expressions) con WITH hacen el código más legible y permiten reutilizar resultados intermedios.",
    code: '<span class="cm">-- CTE para resumen mensual de ventas</span>\n<span class="kw">WITH</span> ventas_mes <span class="kw">AS</span> (\n  <span class="kw">SELECT</span> <span class="fn">MONTH</span>(fecha) mes,\n         <span class="fn">SUM</span>(total)   total\n  <span class="kw">FROM</span>   intelisis.facturas\n  <span class="kw">GROUP BY</span> <span class="fn">MONTH</span>(fecha)\n)\n<span class="kw">SELECT</span> * <span class="kw">FROM</span> ventas_mes\n<span class="kw">ORDER BY</span> mes;',
    extra: "Los CTEs hacen más legibles las consultas complejas y permiten reutilizar resultados intermedios sin necesidad de tablas temporales."
  },
  {
    title: "Funciones de agregación",
    module: "SQL Fundamentos",
    tag: "sql",
    dur: "15 min",
    status: "current",
    body: "COUNT, SUM, AVG, MIN y MAX agrupan datos con GROUP BY. La cláusula HAVING filtra grupos después de la agregación, a diferencia de WHERE que filtra filas antes.",
    code: '<span class="cm">-- Reporte de inventario por almacén</span>\n<span class="kw">SELECT</span>  almacen,\n        <span class="fn">COUNT</span>(*)       productos,\n        <span class="fn">SUM</span>(existencia) total_piezas,\n        <span class="fn">AVG</span>(costo)      costo_prom\n<span class="kw">FROM</span>    intelisis.inventario\n<span class="kw">GROUP BY</span> almacen\n<span class="kw">HAVING</span>  <span class="fn">SUM</span>(existencia) > 0;',
    extra: "GROUP BY y HAVING son clave para reportes gerenciales de inventario, ventas y CxC en Intelisis. Se usan ampliamente en los cubos de Business Intelligence."
  },

  // ── INTELISIS ERP (índices 4–7) ────────────────────────────────────────────
  {
    title: "Arquitectura de Intelisis",
    module: "Intelisis ERP",
    tag: "erp",
    dur: "22 min",
    status: "done",
    body: "Intelisis es un ERP mexicano multi-empresa y multi-moneda. Su arquitectura de base de datos usa un esquema centralizado donde todos los módulos (Contabilidad, Ventas, Compras, Inventarios) comparten catálogos.",
    code: '<span class="cm">-- Consultar empresas registradas</span>\n<span class="kw">SELECT</span> cia, descripcion, rfc\n<span class="kw">FROM</span>   intelisis.empresas\n<span class="kw">WHERE</span>  activa = <span class="str">\'S\'</span>;',
    extra: "Intelisis trabaja con un esquema multi-empresa. Cada sesión tiene una empresa activa (cia) que filtra todos los movimientos transaccionales."
  },
  {
    title: "Módulo Contabilidad",
    module: "Intelisis ERP",
    tag: "erp",
    dur: "25 min",
    status: "done",
    body: "El módulo de Contabilidad genera pólizas automáticas desde ventas, compras e inventarios. Soporta el catálogo SAT para CFDI y la generación de reportes financieros.",
    code: '<span class="cm">-- Consulta de pólizas del período</span>\n<span class="kw">SELECT</span> folio, fecha, concepto, cargo, abono\n<span class="kw">FROM</span>   intelisis.polizas\n<span class="kw">WHERE</span>  periodo = <span class="str">\'2026-05\'</span>\n  <span class="kw">AND</span>  tipo    = <span class="str">\'D\'</span>\n<span class="kw">ORDER BY</span> fecha;',
    extra: "Comprender la estructura de pólizas facilita las conciliaciones contables y la generación de reportes para auditoría."
  },
  {
    title: "Módulo Inventarios",
    module: "Intelisis ERP",
    tag: "erp",
    dur: "28 min",
    status: "current",
    body: "Intelisis maneja inventarios con valoración PEPS o costo promedio, kardex en tiempo real, control por lotes, series y almacenes múltiples.",
    code: '<span class="cm">-- Existencias por almacén y producto</span>\n<span class="kw">SELECT</span>  a.descripcion  almacen,\n        p.descripcion  producto,\n        i.existencia,\n        i.costo_prom\n<span class="kw">FROM</span>    intelisis.inventario i\n<span class="kw">JOIN</span>    intelisis.almacenes  a  <span class="kw">ON</span> i.cve_alma = a.cve_alma\n<span class="kw">JOIN</span>    intelisis.productos  p  <span class="kw">ON</span> i.cve_prod = p.cve_prod;',
    extra: "La tabla de inventario refleja existencias en tiempo real. Los movimientos de entrada y salida se registran en la tabla de kárdex con tipo de movimiento y referencia de documento."
  },
  {
    title: "Módulo Ventas y CxC",
    module: "Intelisis ERP",
    tag: "erp",
    dur: "20 min",
    status: "locked",
    body: "El módulo de Ventas cubre cotizaciones, pedidos, remisiones y facturas electrónicas (CFDI 4.0). CxC gestiona el saldo pendiente de clientes y su conciliación con Contabilidad.",
    code: '',
    extra: "Próximamente disponible."
  },

  // ── SDK INTELISIS (índices 8–9) ────────────────────────────────────────────
  {
    title: "Instalación del SDK",
    module: "SDK Intelisis",
    tag: "sdk",
    dur: "10 min",
    status: "done",
    body: "El SDK oficial de Intelisis permite conectarse a su API REST desde Node.js, C# y Python. El paquete expone métodos para autenticar, consultar catálogos y crear documentos transaccionales.",
    code: '<span class="cm">// Instalar SDK (Node.js)</span>\n<span class="cm">// npm install intelisis-sdk</span>\n\n<span class="kw">const</span> { IntelisisClient } = <span class="fn">require</span>(<span class="str">\'intelisis-sdk\'</span>);\n\n<span class="kw">const</span> client = <span class="kw">new</span> <span class="fn">IntelisisClient</span>({\n  host: <span class="str">\'https://mi-servidor.intelisis.com\'</span>,\n  cia:  <span class="str">\'MIEMPRESA\'</span>\n});',
    extra: "El SDK abstrae los detalles de HTTP, manejo de tokens y serialización. Hay wrappers disponibles para .NET (NuGet) y Python (pip)."
  },
  {
    title: "Autenticación y tokens",
    module: "SDK Intelisis",
    tag: "sdk",
    dur: "15 min",
    status: "current",
    body: "Intelisis usa OAuth 2.0 con tokens JWT de 60 minutos de validez. Para procesos batch o integraciones continuas, implementa refresh automático con el parámetro autoRefresh.",
    code: '<span class="cm">// Autenticar y guardar token</span>\n<span class="kw">const</span> token = <span class="kw">await</span> client.<span class="fn">auth</span>({\n  usuario:  <span class="str">\'admin\'</span>,\n  password: process.env.INTEL_PASS\n});\n\nclient.<span class="fn">setToken</span>(token.access_token);\nconsole.<span class="fn">log</span>(<span class="str">\'Conectado a Intelisis ✓\'</span>);\n\n<span class="cm">// Refrescar automáticamente antes de expirar</span>\nclient.<span class="fn">enableAutoRefresh</span>();',
    extra: "Nunca guardes credenciales en el código fuente. Usa variables de entorno (.env) o un gestor de secretos como Azure Key Vault o AWS Secrets Manager."
  },
];

// =============================================
// DATA: Preguntas del quiz
// Agrega más objetos al arreglo para más preguntas
// =============================================

const questions = [
  {
    q: "¿Qué cláusula SQL se usa para filtrar filas antes de la agregación?",
    opts: ["HAVING", "WHERE", "GROUP BY", "ORDER BY"],
    correct: 1,
    explanation: "WHERE filtra filas individuales antes de agrupar. HAVING filtra grupos después de GROUP BY."
  },
  {
    q: "En Intelisis, ¿qué JOIN devuelve solo los pedidos que tienen cliente registrado?",
    opts: ["LEFT JOIN", "CROSS JOIN", "INNER JOIN", "FULL OUTER JOIN"],
    correct: 2,
    explanation: "INNER JOIN devuelve únicamente las filas con coincidencia en ambas tablas."
  },
  {
    q: "¿Qué función SQL cuenta el número de filas en un resultado?",
    opts: ["SUM()", "AVG()", "COUNT()", "MAX()"],
    correct: 2,
    explanation: "COUNT(*) cuenta todas las filas; COUNT(columna) ignora los NULL."
  },
  {
    q: "¿Qué significa CTE en SQL?",
    opts: ["Common Table Expression", "Central Table Entity", "Controlled Transaction Entry", "Column Type Extension"],
    correct: 0,
    explanation: "Common Table Expression — definida con WITH, mejora la legibilidad y permite referencias recursivas."
  },
  {
    q: "En el SDK de Intelisis, ¿cuántos minutos tiene validez un token JWT por defecto?",
    opts: ["15 min", "30 min", "60 min", "120 min"],
    correct: 2,
    explanation: "Los tokens JWT de Intelisis expiran en 60 minutos. Usa enableAutoRefresh() para renovarlos automáticamente."
  },
  {
    q: "¿Qué tabla de Intelisis almacena las existencias actuales por almacén?",
    opts: ["intelisis.pedidos", "intelisis.inventario", "intelisis.polizas", "intelisis.facturas"],
    correct: 1,
    explanation: "La tabla intelisis.inventario contiene existencia y costo_prom por producto y almacén en tiempo real."
  }
];
