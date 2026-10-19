# Ritual · Daily tracker

App web instalable en el móvil (iPhone y Android) para hábitos, cuidado personal y el plan del día.
4 perfiles independientes (Nuria, ML, Luis, Serra) con una cuenta común. Datos en Supabase, alojada en GitHub Pages.

---

## 1. Supabase (base de datos) · 10 min

1. Entra en [supabase.com](https://supabase.com) → **New project**. Nombre: `ritual`. Región: **West EU (Ireland)** o Frankfurt. Apunta la contraseña de la base de datos (no la usarás en la app).
2. Cuando esté listo: menú izquierdo **SQL Editor** → **New query** → pega todo el contenido de `supabase/schema.sql` → **Run**. Crea las tablas, la seguridad y los 4 perfiles.
3. **Authentication → Users → Add user → Create new user**: pon el correo y la contraseña comunes de los cuatro. Marca **Auto Confirm User**.
4. **Authentication → Sign In / Providers** (o *Settings*): desactiva **Allow new users to sign up**. Así nadie más puede crearse cuenta.
5. **Project Settings → API Keys** (o botón **Connect**): copia
   - la **Project URL** (`https://xxxx.supabase.co`)
   - la clave **anon / publishable**.
6. Abre `js/config.js` y pega los dos valores:

```js
export const CONFIG = {
  SUPABASE_URL: 'https://xxxx.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOi...',
};
```

> La clave *anon* puede ir en un repositorio público: sin iniciar sesión con vuestra cuenta, la base de datos no deja leer ni escribir nada.
> Nunca pegues la clave **service_role / secret**.

## 2. GitHub Pages (la web) · 5 min

1. En GitHub → **New repository** → nombre `ritual` → **Public** (Pages gratis requiere repo público) → Create.
2. **Add file → Upload files** → arrastra **todo el contenido** de esta carpeta (index.html, css, js, icons, manifest.webmanifest, sw.js, supabase, README.md) → **Commit changes**.
3. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main** / **(root)** → Save.
4. En 1–2 minutos tendrás la app en `https://TU-USUARIO.github.io/ritual/`.

## 3. Instalarla en el móvil

- **iPhone (Safari):** abre el enlace → botón **Compartir** → **Añadir a pantalla de inicio**.
- **Android (Chrome):** abre el enlace → menú ⋮ → **Instalar app** / **Añadir a pantalla de inicio**.

Cada persona entra una vez con el correo y la contraseña comunes, elige su perfil y la app lo recuerda en ese móvil.

## 4. Primer uso

- Cada perfil elige una **plantilla** (completa chica, completa chico, básica o vacía) y marca o desmarca lo que quiera. Todo se puede cambiar después en **Más → Mis categorías**.
- **Cuidado → Rutinas → Cargar la lista de productos de ejemplo** carga los productos de Nuria (CeraVe, Bioderma, The Ordinary, Deliplus, Neutrogena, L'Oréal…), perfumes y combos. Pon la **fecha de apertura** y el **PAO** en Inventario para los avisos de caducidad.
- **IPL:** en *Cuidado → IPL → Editar* pon la fecha de tu última sesión (junio). La app te dirá que reinicies la fase inicial. Antes de retomar, revisa la tarjeta *Sol y bronceado*.
- **Más → Editar perfil:** cambia nombre, color, imagen, minutos de ejercicio, nombre y minutos de tu proyecto, y tu tiempo libre habitual.

## 5. Actualizar la app

Si cambias algún archivo, súbelo de nuevo a GitHub y en `sw.js` cambia `VERSION` (por ejemplo `ritual-v2`) para que los móviles carguen la versión nueva.

## Notas

- **Modo demo:** si `js/config.js` está vacío, la app funciona igual pero guarda los datos solo en ese navegador. Sirve para probarla.
- **Plan gratuito de Supabase:** si nadie usa la app durante una semana, el proyecto puede pausarse. Se reactiva con un clic desde el panel de Supabase.
- **Copia de seguridad:** *Más → Descargar copia de mis datos* baja un JSON con todo tu perfil.
- **Escáner de productos:** usa la cámara y la base de datos abierta [Open Beauty Facts](https://world.openbeautyfacts.org). No todos los productos están; si no aparece, se rellena a mano.
- **UV y humedad:** vienen de [Open-Meteo](https://open-meteo.com) (gratis, sin clave). La ciudad se cambia en el perfil.
- **Consejos de cuidado:** basados en la Academia Americana de Dermatología y en las instrucciones de Philips Lumea, con el enlace a la fuente en cada apartado de *Cuidado → Guía*. No sustituyen a un dermatólogo.

## Estructura

```
index.html            entrada
css/styles.css        estilos (claro / oscuro)
js/config.js          ← tus claves de Supabase
js/app.js             arranque, perfiles, Hoy, Calendario
js/care.js            Cuidado: rutinas, IPL, calendarios, inventario, perfumes, looks, viaje, guía
js/progress.js        Progreso: resumen semanal, rachas, mapa de calor, correlaciones, gasto
js/more.js            Tareas, objetivos, inglés, categorías, ajustes
js/store.js           lógica y datos en memoria
js/db.js              conexión Supabase / modo demo
js/data.js            catálogo de categorías, plantillas, productos, reglas y guía
supabase/schema.sql   base de datos
sw.js, manifest       instalación en el móvil
```
