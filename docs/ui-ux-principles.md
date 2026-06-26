# Principios de UI/UX — Guía de referencia

> Investigación destilada de [Laws of UX](https://lawsofux.com/) y sus fuentes citadas
> (Nielsen Norman Group, Interaction Design Foundation, Smashing Magazine, papers
> originales), más guías de micro-interacciones 2025–2026 y marco conceptual de
> diseño persuasivo ético. Este documento es el "porqué"; el skill
> [`ui-ux`](../.claude/skills/ui-ux/SKILL.md) es el "cómo" operativo.

La fórmula corta de un producto que la gente prefiere:

> **utilidad + usabilidad + deseabilidad.**
> La utilidad da la razón para usarlo, la usabilidad elimina la fricción, y la
> deseabilidad (lo emocional y estético) convierte el *uso* en *preferencia*.

---

## Índice

1. [Las leyes de UX, por tema](#1-las-leyes-de-ux-por-tema)
   - [Percepción y agrupación (Gestalt)](#11-percepción-y-agrupación-gestalt)
   - [Memoria y carga cognitiva](#12-memoria-y-carga-cognitiva)
   - [Decisión y fricción](#13-decisión-y-fricción)
   - [Tiempo y velocidad percibida](#14-tiempo-y-velocidad-percibida)
   - [Motivación y progreso](#15-motivación-y-progreso)
   - [Estética, emoción y convención](#16-estética-emoción-y-convención)
2. [Principios fundamentales de diseño web](#2-principios-fundamentales-de-diseño-web)
3. [Qué evitar](#3-qué-evitar)
4. [Diseño persuasivo: ético vs. adictivo](#4-diseño-persuasivo-ético-vs-adictivo)
5. [Fluidez: técnica y percibida](#5-fluidez-técnica-y-percibida)
6. [Checklist accionable](#6-checklist-accionable)
7. [Bibliografía](#7-bibliografía)

---

## 1. Las leyes de UX, por tema

Las 30 leyes de [lawsofux.com](https://lawsofux.com/), agrupadas por el problema que
resuelven. Cada una: definición, origen y *takeaway* accionable.

### 1.1 Percepción y agrupación (Gestalt)

La mente organiza estímulos en patrones. Cinco principios de agrupación
—proximidad, similitud, continuidad, cierre, conexión— gobiernan cómo *vemos*
estructura antes de leer contenido. Usar esto = jerarquía visual sin esfuerzo.

- **Ley de Proximidad** — *Los objetos cercanos se perciben como un grupo.*
  Usa espaciado consistente dentro de un grupo y mayor separación entre grupos
  distintos. El espaciado, no las líneas, es la herramienta primaria de
  agrupación. → *Acelera el escaneo: el ojo agrupa antes de leer.*

- **Ley de Región Común** — *Elementos dentro de un borde/fondo compartido se
  perciben como relacionados.* Tarjetas, contenedores, fondos sutiles agrupan sin
  necesidad de proximidad física. → *Para grupos que no pueden estar juntos, un
  contenedor los une.*

- **Ley de Similitud** — *Elementos visualmente similares (color, forma, tamaño)
  se perciben como del mismo tipo o función.* Todos los enlaces se ven igual;
  todos los botones primarios se ven igual. Diferencia funciones con tratamiento
  visual distinto. → *La consistencia visual comunica función.*

- **Ley de Conexión Uniforme** — *Elementos conectados visualmente (líneas,
  contenedor, color) se perciben como más relacionados que los meramente
  cercanos.* Es la forma de agrupación más fuerte. → *Conecta lo que actúa junto.*

- **Ley de Prägnanz** — *La gente interpreta imágenes complejas en su forma más
  simple posible.* El cerebro prefiere lo simple porque reduce esfuerzo cognitivo.
  → *Simplifica formas y layouts; lo simple se procesa más rápido.*

> Origen común: psicología de la Gestalt (principios de agrupación).
> Fuentes: [NN/g – Proximity](https://www.nngroup.com/articles/gestalt-proximity/),
> [NN/g – Common Region](https://www.nngroup.com/articles/common-region/),
> [Smashing – Gestalt](https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/).

### 1.2 Memoria y carga cognitiva

- **Carga Cognitiva** — *Los recursos mentales necesarios para entender e
  interactuar con una interfaz.* Carga **intrínseca** (la del problema en sí) vs.
  **extrínseca** (la que añade un mal diseño). Elimina la extrínseca; respeta la
  intrínseca. → *Cada elemento superfluo gasta atención que no vuelve.*
  (Sweller, 1988. [NN/g](https://www.nngroup.com/articles/minimize-cognitive-load/))

- **Ley de Miller** — *La memoria de trabajo retiene ~7±2 elementos.* No es excusa
  para limitar artificialmente, pero sí razón para **agrupar (chunk)** la
  información en unidades con sentido. (Miller, 1956)

- **Chunking** — *Dividir información en grupos con significado.* Números de
  teléfono, pasos numerados, secciones. → *Estructura escaneable = comprensión
  más rápida.* ([NN/g](https://www.nngroup.com/articles/chunking/))

- **Memoria de Trabajo** — *Sistema temporal que retiene y manipula información
  para la tarea en curso.* No obligues al usuario a recordar entre pantallas;
  muestra el contexto que necesita, cuando lo necesita.

- **Atención Selectiva** — *Filtramos lo irrelevante para la meta.* Consecuencia:
  "banner blindness" — los usuarios ignoran lo que parece publicidad. → *No
  disfraces lo importante de adorno.*

### 1.3 Decisión y fricción

- **Ley de Hick** — *El tiempo de decisión crece con el número y complejidad de
  opciones.* Reduce opciones cuando la rapidez importa; divide tareas complejas en
  pasos; destaca la opción recomendada; usa onboarding progresivo. **Pero** no
  simplifiques hasta la abstracción. (Hick & Hyman, 1952)

- **Sobrecarga de Elección** (paradoja de la elección) — *Demasiadas opciones
  abruman y reducen la satisfacción.* Defaults sensatos, comparación lado a lado,
  filtros, destacar lo recomendado. (Toffler, 1970)

- **Ley de Tesler** (conservación de la complejidad) — *Todo sistema tiene una
  complejidad irreducible: la absorbe el sistema o el usuario.* El trabajo del
  diseñador es que la absorba el sistema. → *No traslades al usuario la
  complejidad que tú puedes resolver.* (Larry Tesler, Xerox PARC)

- **Navaja de Occam** — *Entre soluciones equivalentes, prefiere la de menos
  supuestos.* Quita hasta que duela; lo que queda es lo esencial.

- **Principio de Pareto** — *~80% de los efectos vienen del ~20% de las causas.*
  Optimiza el 20% de funciones que generan el 80% del valor.

- **Ley de Parkinson** — *El trabajo se expande hasta llenar el tiempo
  disponible.* Tareas con buen flujo y autocompletado se terminan más rápido.

- **Paradoja del Usuario Activo** — *Los usuarios nunca leen el manual; empiezan a
  usar el producto de inmediato.* Diseña para aprender haciendo, no para leer.

- **Ley de Postel** (robustez) — *Sé liberal en lo que aceptas, conservador en lo
  que envías.* Formularios tolerantes: acepta espacios, mayúsculas, formatos
  varios; normaliza por dentro; valida y da feedback claro. → *La flexibilidad del
  sistema es empatía con el usuario.* (Jon Postel)

### 1.4 Tiempo y velocidad percibida

- **Umbral de Doherty** — *La productividad se dispara cuando el sistema responde
  en **<400 ms**; por debajo de eso la interacción se vuelve "adictiva".* Para
  micro-interacciones, el rango ideal de feedback es **0.1–0.3 s**. Cuando no
  puedas ser rápido, sé rápido *en percepción*: animación durante la carga,
  indicadores de progreso, UI optimista. (Doherty & Thadani, IBM, 1982)

- **Skeleton screens vs. spinners vs. progress bars** (NN/g):
  - **< 1 s:** no muestres nada (un flash molesta).
  - **2–10 s:** *spinner* para un módulo aislado; *skeleton* para una página
    completa (da forma a lo que viene y reduce carga cognitiva).
  - **> 10 s:** *barra de progreso* (da sensación del estado del sistema).
  - Evita skeletons que solo muestran header/footer vacíos: parecen "roto".

  → *La velocidad percibida importa tanto como la real. Optimiza First Contentful
  Paint, Time-to-Interactive y la respuesta a cada input.*

### 1.5 Motivación y progreso

> El cerebro humano está cableado para perseguir progreso. Estas tres leyes son la
> base de streaks, completion bars y checkmarks.

- **Efecto Goal-Gradient** — *La motivación para alcanzar una meta crece con la
  proximidad a ella.* Muestra progreso visible; usa **endowed progress** (empezar
  con avance ya hecho: una tarjeta de fidelidad con 2 sellos ya puestos se
  completa más rápido que una vacía). (Hull, 1932; Kivetz et al.)

- **Efecto Zeigarnik** — *Las tareas incompletas se recuerdan mejor que las
  completas.* Barras de progreso, "te falta 1 paso", *sneak peeks* del contenido
  restante invitan a volver y terminar. (Bluma Zeigarnik, 1920s.
  [NN/g](https://www.nngroup.com/articles/zeigarnik-effect-women-in-ux/))

- **Regla Peak-End** — *Recordamos una experiencia por su momento más intenso
  (peak) y por su final, no por el promedio.* Diseña **picos memorables** (una
  micro-celebración cuando se logra algo) y **finales positivos**. Atiende también
  los picos *negativos*: una mala espera o un error se recuerdan vívidamente.
  (Kahneman et al., 1993.
  [NN/g](https://www.nngroup.com/articles/peak-end-rule/))

### 1.6 Estética, emoción y convención

- **Efecto Estético-Usabilidad** — *Los usuarios perciben lo bonito como más
  usable* — incluso cuando objetivamente no lo es. Y, más importante: **perdonan
  más errores** en interfaces atractivas y **persisten más** resolviendo
  problemas. La estética en producto serio no es decoración: es inversión con
  retorno funcional. (Kurosu & Kashimura, Hitachi, 1995.
  [NN/g](https://www.nngroup.com/articles/aesthetic-usability-effect/))

- **Efecto Von Restorff** (aislamiento) — *Entre elementos similares, el distinto
  se recuerda más.* Haz que la acción principal destaque (color, tamaño,
  contraste). **Con moderación:** si todo destaca, nada destaca. **Accesibilidad:**
  no dependas solo del color; cuida la sensibilidad al movimiento. (Von Restorff,
  1933)

- **Efecto de Posición Serial** — *Se recuerdan mejor el primer y el último
  elemento de una serie.* Pon las acciones clave en los extremos de una
  navegación; lo menos importante, en el medio. (Ebbinghaus)

- **Sesgo Cognitivo** — *Errores sistemáticos de juicio.* Conócelos para no
  explotarlos (ética) y para diseñar con la mente real del usuario, no la ideal.

- **Modelo Mental** — *La idea comprimida que el usuario tiene de cómo funciona el
  sistema.* El diseño debe coincidir con ese modelo; el desajuste es la raíz de la
  mayoría de la confusión.

- **Ley de Jakob** — *Los usuarios pasan la mayor parte del tiempo en **otros**
  sitios; esperan que el tuyo funcione igual.* Usa patrones estándar (toggles,
  botones, navegación) en vez de reinventarlos. La innovación va en el valor, no en
  reaprender la UI. (Jakob Nielsen)

- **Flow** — *Inmersión total con foco enérgico y disfrute.* Surge cuando el reto
  se equilibra con la habilidad, hay feedback claro y poca fricción. (Csíkszentmihályi, 1975)

- **Ley de Fitts** — *El tiempo para alcanzar un objetivo depende de su distancia y
  su tamaño.* Botones primarios grandes y cercanos al foco; targets táctiles
  amplios y bien espaciados. (Paul Fitts, 1954)

---

## 2. Principios fundamentales de diseño web

- **Jerarquía visual** — guía el ojo a lo importante con tamaño, color, contraste
  y posición. Lo crítico se ve primero.
- **Consistencia** — mismos patrones, espaciados, colores y comportamientos en
  toda la interfaz. Reduce carga cognitiva (es la Ley de Jakob aplicada hacia
  dentro).
- **Espacio en blanco (whitespace)** — el aire entre elementos no es desperdicio;
  mejora legibilidad y foco. Espaciado generoso ayuda al escaneo.
- **Contraste y legibilidad** — texto legible sin esfuerzo; ratios de contraste
  **WCAG AA mínimo** (4.5:1 texto normal, 3:1 texto grande).
- **Affordances claras** — que un botón parezca botón; que lo clickeable se vea
  clickeable.
- **Feedback inmediato** — toda acción del usuario recibe respuesta visible
  (hover, loading, confirmación). Click → algo se mueve, cambia de color, o
  confirma.
- **Ley de proximidad (Gestalt)** — agrupar lo relacionado, separar lo distinto.
- **Accesibilidad** — navegable por teclado, compatible con lectores de pantalla,
  no depender solo del color para comunicar.

Tres leyes que conviene nombrar explícitamente al planear una interfaz:
**Hick** (a más opciones, más tiempo de decisión → simplifica), **Fitts**
(objetivos grandes y cercanos → botones primarios grandes) y **Jakob** (no
reinventes patrones estándar).

---

## 3. Qué evitar

- Sobrecarga visual: demasiados elementos compitiendo por atención.
- Inconsistencia: botones que cambian de estilo, navegación impredecible.
- Tiempos de carga lentos (y ausencia de velocidad percibida).
- Texto de bajo contraste o tipografías diminutas.
- Pop-ups intrusivos y modales que interrumpen sin valor.
- Navegación oculta o confusa; "menús misteriosos".
- Carruseles automáticos que el usuario no controla.
- Falta de estados bien diseñados: **vacío**, **carga**, **error**.
- **Dark patterns**: trucos que manipulan (suscripciones difíciles de cancelar,
  casillas premarcadas, urgencia falsa). Funcionan a corto plazo; **destruyen
  confianza** a largo plazo.

Regla operativa de fricción: **cada click extra es deuda. Cada modal innecesario
es deuda. Cada confirmación que pide algo obvio es deuda.**

---

## 4. Diseño persuasivo: ético vs. adictivo

Técnicas de la economía conductual y el diseño persuasivo. La línea ética está en
si **sirven al usuario o lo explotan**.

Mecanismos de productos "adictivos":
- **Recompensas variables** — la incertidumbre (el feed que se refresca) activa
  dopamina más que una recompensa predecible. Es el mecanismo de la tragamonedas.
- **Scroll infinito** — elimina los puntos de parada naturales.
- **Loops de retroalimentación social** — likes, notificaciones, contadores.
- **Hook loop** (Nir Eyal) — disparador → acción → recompensa variable → inversión
  del usuario, que reinicia el ciclo.
- **Progreso y rachas (streaks)** — aversión a perder lo acumulado.
- **Fricción cero para consumir, fricción alta para salir.**

> Juicio de diseño: muchos de estos mecanismos maximizan *tiempo de uso*, no
> *bienestar*. Para producto serio (educación, BI, finanzas, herramientas) lo
> deseable es lo **opuesto**: que el usuario logre su objetivo y se vaya
> satisfecho. Streaks y progreso son legítimos **cuando sirven al aprendizaje del
> usuario**, no cuando lo enganchan a costa suya.

---

## 5. Fluidez: técnica y percibida

**Fluidez técnica (responsive/fluid layout):**
- Unidades relativas (`%`, `rem`, `fr`, `clamp()`) en vez de píxeles fijos.
- Grid y flexbox que se reorganizan según el viewport.
- Imágenes y media escalables.
- Breakpoints pensados por contenido, no por dispositivos concretos.

**Fluidez percibida (la sensación de "fluir"):**
- Transiciones y animaciones suaves: easing natural (acelera y desacelera, nunca
  lineal/robótico), **~200–300 ms**, nunca abruptas.
- Respuesta inmediata a cada interacción (Doherty).
- Cero saltos de layout (**CLS** bajo).
- Carga progresiva y skeletons en vez de pantallas en blanco.
- Estado de **flow** (Csíkszentmihályi): el usuario avanza sin interrupciones, con
  objetivos claros y feedback constante.

**Cómo se "enamora" la gente de un diseño** (la suma, no una sola cosa):
funciona sin tener que pensar ("Don't make me think", Krug) · primera impresión
estética (efecto halo) · deleite en los detalles (micro-interacciones, copy con
voz humana — *Designing for Emotion*, Aarron Walter) · coherencia y previsibilidad
· sensación de competencia (el buen diseño hace al usuario sentirse capaz, no
torpe) · velocidad (la fluidez se siente como respeto por su tiempo) · identidad
(cuando el producto refleja sus valores, se vuelve "suyo").

---

## 6. Checklist accionable

**Feedback inmediato**
- [ ] Todo click/hover/focus tiene respuesta visual en **< 400 ms** (ideal 0.1–0.3 s).
- [ ] Estados `:hover`, `:active`, `:focus-visible` definidos y consistentes.
- [ ] Transiciones 150–300 ms con easing natural (no lineal).

**Velocidad percibida**
- [ ] Optimiza FCP / TTI / respuesta a input.
- [ ] Skeleton por umbral: <1 s nada · 2–10 s skeleton/spinner · >10 s progress bar.
- [ ] UI optimista donde el resultado sea predecible.
- [ ] Sin saltos de layout (CLS bajo); reserva espacio antes de cargar.

**Progreso visible**
- [ ] Completion bars, checkmarks, streaks donde aporten al usuario.
- [ ] *Endowed progress* (arranca con algo de avance).
- [ ] Persiste el progreso (p. ej. localStorage).

**Micro-celebraciones**
- [ ] Sutiles, con personalidad, en hitos reales (Peak-End).
- [ ] **Siempre** respetan `prefers-reduced-motion`.
- [ ] Una sola vez por logro, no en bucle.

**Jerarquía visual**
- [ ] Agrupa con proximidad / región común / similitud (Gestalt).
- [ ] El CTA destaca (Von Restorff), con moderación.
- [ ] Targets grandes y cercanos (Fitts); espaciado generoso.
- [ ] Color usado con intención, no por capricho.

**Fricción cero**
- [ ] Menos opciones por pantalla (Hick); defaults sensatos.
- [ ] Sin modales/confirmaciones innecesarias.
- [ ] El sistema absorbe la complejidad (Tesler), no el usuario.

**Accesibilidad (no negociable)**
- [ ] Contraste **WCAG AA**.
- [ ] Foco visible; navegación completa por teclado.
- [ ] No depender solo del color para comunicar.
- [ ] `aria-live` para actualizaciones dinámicas.

**Ética**
- [ ] Cero dark patterns. La persuasión sirve al usuario, no lo explota.

---

## 7. Bibliografía

**Laws of UX** — índice y leyes individuales: <https://lawsofux.com/>

**Nielsen Norman Group**
- Aesthetic-Usability Effect — <https://www.nngroup.com/articles/aesthetic-usability-effect/>
- Skeleton screens / perceived performance — <https://www.nngroup.com/articles/progress-indicators/>
- Peak-End Rule — <https://www.nngroup.com/articles/peak-end-rule/>
- Zeigarnik Effect — <https://www.nngroup.com/articles/zeigarnik-effect-women-in-ux/>
- Chunking — <https://www.nngroup.com/articles/chunking/>
- Common Region — <https://www.nngroup.com/articles/common-region/>
- Minimize Cognitive Load — <https://www.nngroup.com/articles/minimize-cognitive-load/>
- Fitts's Law — <https://www.nngroup.com/articles/fitts-law/>
- Microinteractions — <https://www.nngroup.com/articles/microinteractions/>

**Interaction Design Foundation**
- Hick's Law — <https://www.interaction-design.org/literature/article/hick-s-law-making-the-choice-easier-for-users>
- Serial Position Effect — <https://www.interaction-design.org/literature/article/serial-position-effect-how-to-create-better-user-interfaces>
- Fitts's Law — <https://www.interaction-design.org/literature/article/fitts-s-law-the-importance-of-size-and-distance-in-ui-design>

**Smashing Magazine**
- Gestalt principles of visual perception — <https://www.smashingmagazine.com/2014/03/design-principles-visual-perception-and-the-principles-of-gestalt/>
- Fitts' Law in the touch era — <https://www.smashingmagazine.com/2022/02/fitts-law-touch-era/>

**Papers y libros clave**
- Kurosu & Kashimura (1995) — Aesthetic-usability (Hitachi)
- Doherty & Thadani (1982) — *The Economic Value of Rapid Response Time* (IBM)
- Miller (1956) — *The Magical Number Seven, Plus or Minus Two*
- Sweller (1988) — Cognitive Load Theory
- Hull (1932) — Goal-gradient hypothesis
- Kahneman et al. (1993) — *When More Pain Is Preferred to Less*
- Fitts (1954) — Information capacity of the motor system
- Csíkszentmihályi (1975) — *Flow*
- Krug — *Don't Make Me Think*
- Aarron Walter — *Designing for Emotion*
- Nir Eyal — *Hooked* (referencia crítica: usar con ética)
