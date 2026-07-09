# Arithmetica

### Interactive Statistical Learning Platform

**Arithmetica** es una plataforma educativa de código abierto diseñada para la enseñanza de **Álgebra Lineal**, **Statistical Learning**, **Machine Learning**, **Deep Learning** y **fundamentos de LLM y agentes de IA** a nivel de posgrado.

A diferencia de los libros de texto estáticos o los dashboards complejos, Arithmetica funciona como un **"Libro de Texto Vivo"**: combina la rigurosidad académica y la tipografía cuidada con visualizaciones interactivas de alto rendimiento que permiten al estudiante "tocar" las matemáticas.

---

## 📐 Filosofía de Diseño

1. **Sobriedad Académica (Swiss Style):** Priorizamos la lectura. Fondo *Off-white* para evitar fatiga visual y tipografía *Serif* para el cuerpo del texto.
2. **Cero "Cajas Negras":** Las visualizaciones no son decorativas; son simulaciones matemáticas que responden en tiempo real.
3. **Rendimiento (Islands Architecture):** El sitio es estático (HTML/CSS) por defecto. JavaScript solo se carga ("hidrata") en los componentes interactivos.

---

## 🛠 Tech Stack

El proyecto evita la sobreingeniería. Utilizamos herramientas modernas enfocadas en contenido y manipulación directa del DOM.

* **Core Framework:** [Astro](https://astro.build/) (vía **Starlight** theme) - Manejo de contenido, routing y documentación.
* **Interactividad:** [Svelte](https://svelte.dev/) - Componentes reactivos sin Virtual DOM.
* **Matemáticas Gráficas:** [D3.js](https://d3js.org/) (Solo módulos `d3-scale`) - Lógica de escalas y dominios.
* **Estilos:** [Tailwind CSS](https://tailwindcss.com/) - Utilidades de diseño.
* **Fórmulas:** [KaTeX](https://katex.org/) - Renderizado nativo de LaTeX en MDX.

---

## 🎨 Design System — "Ink & Copper"

Los tokens de color viven en **un solo lugar** (`src/lib/svm/colors.ts`, reflejado
en `tailwind.config.mjs` y `src/styles/global.css`). Impórtalos; nunca escribas
hex en el marcado.

| Token | Hex | Uso |
| --- | --- | --- |
| **paper** | `#F5F3EE` | Fondo off-white cálido. Nunca blanco puro. |
| **paper-raised** | `#FBFAF6` | Tarjetas y superficies elevadas. |
| **ink** | `#1F1D1B` | Texto principal, títulos. |
| **muted** | `#7A756B` | Texto secundario, etiquetas. |
| **interactive** | `#1A3A6B` | Azul tinta. Controles, CTAs, geometría interactiva. |
| **copper / slate** | `#B5532A` / `#3B4252` | Las dos clases de datos en las visualizaciones. |
| **success** | `#2E7D52` | Checkmarks, completitud, micro-celebraciones. |
| **line / axis** | `#E3DFD4` / `#CFC9BA` | Bordes / ejes y gridlines. |

Las buenas prácticas de UI/UX están documentadas en
[`docs/ui-ux-principles.md`](docs/ui-ux-principles.md) y codificadas en el skill
`ui-ux`. Toda animación respeta `prefers-reduced-motion`.

---

## 🚀 Instalación y Desarrollo

Requisitos: Node.js 18+

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/arithmetica.git
cd arithmetica

# 2. Instalar dependencias
npm install

# 3. Iniciar servidor de desarrollo
npm run dev

```

El sitio estará disponible en `http://localhost:4321`.

---

## 📂 Estructura del Proyecto

```text
src/
├── components/          # Componentes interactivos (Svelte), un directorio por tema
│   ├── svm/ dt/ dl/ …   #   visualizaciones de cada lección de ML / DL
│   ├── la/              #   15 islas del curso "Álgebra Lineal"
│   ├── llm/             #   29 islas del curso "Fundamentos de LLM y Agentes de IA"
│   └── ui/              #   primitivas UX (LessonCard, Celebrate, PresentMode…)
├── lib/                 # Lógica matemática/pedagógica (TS puro, determinista)
│   ├── svm/             #   el patrón original: prng sembrado (mulberry32),
│   │                    #   datasets, kernels, solvers, drag.ts y colors.ts
│   ├── dt/ dl/ rl/ …    #   motores por tema (CART, backprop, value iteration…)
│   ├── la/              #   SVD (Jacobi), eigen 2×2 cerrado, PageRank, embeddings
│   └── llm/             #   tokenizador BPE educativo, softmax con temperature,
│                        #   atención, agentes scripted, harness, RAG, embeddings 2D
├── content/
│   └── docs/            # Páginas del libro (MDX)
│       ├── algebra-lineal/  # curso de Álgebra Lineal (5 lecciones)
│       ├── ml/          #   lecciones de Statistical Learning / ML / DL
│       └── llm/         #   curso de LLM y agentes de IA (7 lecciones)
└── styles/              # CSS global (Tailwind directives)

```

> **Patrón clave:** toda la matemática vive en `src/lib/<tema>/` (TypeScript
> puro, determinista y verificable por separado — el tema SVM estableció el
> patrón) y los componentes `.svelte` solo hacen render SVG + reactividad.
> Esto mantiene los componentes pequeños y permite que varias visualizaciones
> reusen los mismos solvers, la acción de arrastre y los tokens de color.

---

## ✍️ Cómo agregar un nuevo tema

Para añadir una nueva lección (ej. "Descenso de Gradiente") sigue estos 3 pasos:

### 1. Crear el Componente Interactivo

Crea `src/components/ml/GradientDescent.svelte`.

* Usa `d3-scale` para mapear los datos.
* Usa `<svg>` nativo dentro de Svelte.
* Asegúrate de que reciba props para los parámetros iniciales.

### 2. Crear el Contenido MDX

Crea `src/content/docs/ml/gradient-descent.mdx`.

* Define el `title` y `description` en el frontmatter.
* Escribe la teoría usando Markdown y LaTeX (`$$formula$$`).

### 3. Integrar ("Hidratar")

Importa el componente en el archivo MDX y usa la directiva `client:visible` para activar la interactividad.

```mdx
---
title: Descenso de Gradiente
description: Visualizando la optimización de la función de costo.
---

import GradientDescent from '../../../components/ml/GradientDescent.svelte';

El algoritmo actualiza los pesos iterativamente:

$$ w := w - \alpha \nabla J(w) $$ 

Experimenta con el *Learning Rate* ($\alpha$):

<GradientDescent client:visible initialRate={0.01} />

```

---

## 🤝 Contribución

1. Mantén los componentes de Svelte por debajo de las 100 líneas de lógica siempre que sea posible.
2. No instales librerías de gráficos pesadas (Plotly, Highcharts). Usa D3 + Svelte.
3. Asegúrate de que todos los gráficos sean responsivos (`viewBox` + Tailwind `w-full`).

---

**Licencia:** GNU Affero General Public License v3.0 (AGPL-3.0)

