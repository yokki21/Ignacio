# Ignacio · nutrición y gimnasio

Web instalable (PWA): menú diario con intercambios, contador de calorías con objetivo adaptativo, rutinas con progresión automática y seguimiento de hábitos. HTML, CSS y JavaScript sin dependencias ni compilación.

## Qué hace

- **Cuestionario inicial**: persona, actividad, objetivo, alimentación (comidas al día, dieta, alergias, alimentos que no gustan, batidos), entrenamiento (días, lugar, material, experiencia, lesiones, ejercicios a evitar) y hábitos. Todo lo opcional se puede completar después en Ajustes → Tu perfil, y al guardar se recalcula todo.
- **Objetivo adaptativo (tipo MacroFactor)**: parte de una estimación y cada semana recalcula el mantenimiento real con tus pesajes y lo que registras.
- **Menú del día** que respeta dieta, alergias y gustos, cuadra con tus macros y no repite el alimento principal. «Cambiar plato» muestra una lista de platos con macros parecidos; ⇄ cambia un alimento por otro equivalente.
- **Añadir comida** en una sola pantalla: buscador con «+» para añadir en un toque, cantidad con atajos, escáner, solo calorías, crear alimento, «igual que ayer» y varias cosas seguidas.
- **Rutinas generadas** según días, material, experiencia, objetivo y lesiones (cuerpo completo, torso/pierna, empuje/tirón/pierna o por grupos musculares), sesión con temporizador, progresión por RIR, récords e importación de Hevy.
- **Progreso**: tendencia de peso, revisión semanal, informe, medidas y fotos.

## 1. Crear el proyecto de Firebase (para la cuenta de Google)

1. Entra en https://console.firebase.google.com → **Añadir proyecto** → nombre `ignacio` (Analytics puedes desactivarlo).
2. **Compilación → Authentication → Comenzar → Google → Habilitar** y guarda.
3. **Authentication → Configuración → Dominios autorizados → Añadir dominio**: `yokki21.github.io`.
4. **Compilación → Firestore Database → Crear base de datos** → ubicación `eur3 (europe-west)` → modo producción.
5. En **Firestore → Reglas**, pega esto y publica:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

6. **Configuración del proyecto (⚙️) → Tus apps → Web (</>)** → registra la app (sin Hosting). Copia el objeto `firebaseConfig` y pégalo en `firebase-config.js`.

Con el plan gratuito (Spark) sobra: los datos son pequeños. Las fotos no se suben porque Firebase Storage exige ahora el plan de pago.

## 2. Publicar en GitHub Pages

```bash
cd ignacio
git init && git add . && git commit -m "Ignacio v1"
git branch -M main
git remote add origin https://github.com/yokki21/Ignacio.git
git push -u origin main
```

En GitHub: **Settings → Pages → Deploy from a branch → main / (root)**. Quedará en `https://yokki21.github.io/Ignacio/`.

En el móvil, abre la URL en Chrome → menú → **Añadir a pantalla de inicio**.

Cuando cambies algo, sube `VERSION` en `sw.js` para que el móvil coja la versión nueva.

## 3. Importar Hevy

En Hevy: **Perfil → Ajustes → Exportar e importar datos → Exportar entrenos** (CSV). En Ignacio: **Gym → Importar de Hevy**. Los ejercicios que no reconozca te deja emparejarlos con la biblioteca o crearlos.

## Probar en local

```bash
python3 -m http.server 8000   # y abre http://localhost:8000
```

## Estructura

```
index.html, css/styles.css, manifest.webmanifest, sw.js, firebase-config.js
js/app.js          arranque, Hoy y Diario
js/v-food.js       buscador, escáner, alimentos propios y recetas
js/v-gym.js        rutinas, sesión, historial, Hevy
js/v-progreso.js   peso, revisión semanal, medidas, fotos, informe
js/v-ajustes.js    perfil, objetivo, tipos de día, datos
js/nutrition.js    cálculos de energía, ajuste adaptativo y generador de menús
js/gym.js          progresión, récords, CSV de Hevy
js/store.js        datos locales · js/sync.js  Firebase
js/data/           alimentos, ejercicios/rutinas y valores iniciales
```

Valores nutricionales aproximados (BEDCA/USDA). Para productos de marca, mejor escanear o crearlos con la etiqueta.
