# Arithmetica

### Interactive Statistical Learning Platform

**Arithmetica** es una plataforma educativa de código abierto diseñada para la enseñanza de **Statistical Learning**, **Machine Learning** y **Deep Learning** a nivel de posgrado.

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

## 🎨 Design System

Respetar estrictamente la paleta de colores para mantener la identidad visual.

| Variable | Hex | Uso Estricto |
| --- | --- | --- |
| **Paper** | `#FAF9F6` | Fondo principal. Nunca usar blanco puro (`#FFFFFF`). |
| **Ink** | `#222222` | Texto principal, títulos y ejes. |
| **Klein Blue** | `#002FA7` | **SOLO** elementos interactivos (sliders, handles, toggles, hover). |

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
├── components/          # Componentes Interactivos (Svelte)
│   └── InteractiveRegression.svelte
├── content/
│   └── docs/            # Páginas del libro (MDX)
│       ├── index.mdx
│       └── ml/
│           └── linear-regression.mdx
└── styles/              # CSS global (Tailwind directives)

```

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

**Licencia:** MIT

