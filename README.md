# IntelisisQ Academy — LMS

Plataforma de aprendizaje (LMS) estática para los módulos:
- SQL para reportes en Intelisis
- Intelisis ERP: módulos clave
- SDK Intelisis: integración y APIs

---

## Estructura de archivos

```
lms-intelisis/
├── index.html          ← Página principal (toda la UI)
├── assets/
│   ├── style.css       ← Estilos globales
│   ├── data.js         ← Lecciones y preguntas (editar aquí)
│   └── app.js          ← Lógica de navegación, quiz y progreso
└── README.md
```

---

## Opción 1 — Servidor estático simple (Node.js)

```bash
# Instalar serve globalmente
npm install -g serve

# Ir a la carpeta del proyecto
cd lms-intelisis

# Arrancar en el puerto 3000
serve -l 3000
```

Abre http://localhost:3000

---

## Opción 2 — Apache / Nginx

Copia toda la carpeta `lms-intelisis/` a la raíz de tu servidor:

```
# Apache: /var/www/html/lms/
# Nginx:  /usr/share/nginx/html/lms/
```

Accede desde el navegador a:  http://tu-servidor/lms/

---

## Opción 3 — Python (sin instalación extra)

```bash
cd lms-intelisis
python3 -m http.server 8080
```

Abre http://localhost:8080

---

## Opción 4 — Docker

Crea un archivo `Dockerfile` junto a la carpeta:

```dockerfile
FROM nginx:alpine
COPY lms-intelisis/ /usr/share/nginx/html/
EXPOSE 80
```

```bash
docker build -t lms-intelisis .
docker run -p 8080:80 lms-intelisis
```

---

## Cómo agregar contenido

### Agregar una lección nueva
Abre `assets/data.js` y agrega un objeto al arreglo `lessons`:

```js
{
  title: "Título de la lección",
  module: "SQL Fundamentos",    // o "Intelisis ERP" / "SDK Intelisis"
  tag: "sql",                   // "sql" | "erp" | "sdk"
  dur: "20 min",
  status: "locked",             // "done" | "current" | "locked"
  body: "Texto introductorio de la lección.",
  code: '<span class="kw">SELECT</span> ...',  // HTML con clases de sintaxis
  extra: "Nota adicional al final."
}
```

### Agregar una pregunta al quiz
Agrega un objeto al arreglo `questions` en `assets/data.js`:

```js
{
  q: "¿Pregunta?",
  opts: ["Opción A", "Opción B", "Opción C", "Opción D"],
  correct: 0,                   // índice de la respuesta correcta
  explanation: "Explicación breve mostrada tras responder."
}
```

---

## Personalización rápida

| Qué cambiar         | Dónde                          |
|---------------------|--------------------------------|
| Nombre de la plataforma | `index.html` → busca "IntelisisQ Academy" |
| Colores corporativos | `assets/style.css` → variables `:root` |
| Usuario activo      | `index.html` → busca "Ana Ramírez" |
| Progreso por módulo | `index.html` → sección `view-progress` |
| Datos del certificado | `index.html` → sección `view-certificate` |

---

## Notas

- No requiere backend ni base de datos para funcionar.
- El progreso del usuario se pierde al recargar (es un prototipo estático).
- Para persistencia real, integra con localStorage, un backend propio (Node/PHP/Python) o un BaaS como Firebase.
