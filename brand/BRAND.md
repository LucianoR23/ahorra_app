# Valuo

**Valuo es la app de plata hecha para Argentina: tarjetas, cuotas y dólares bajo control, con IA que te ahorra la carga.** Sobria y precisa como una app de banco moderna, cercana en cómo habla. Este sistema es la referencia única para la landing (`valuo.ar`) y la app (`app.valuo.ar`): colores, tipografía, espaciado, forma, movimiento y voz.

> Estado: v1.2. Logo final **1B** (wordmark "valuo" + punto ámbar; ícono "v."). Archivos definitivos, con el texto convertido a curvas, en `logo/`, `icons/` y `png/` (ver `README.md`).

## Principios

1. **Los números primero.** Lo importante en cada pantalla es un monto o una fecha. Todo lo demás acompaña en `ink-muted`.
2. **Monocromo + un acento.** La interfaz es tinta sobre papel (`ink` sobre `bg`/`surface`). El ámbar (`accent`) aparece poco y significa *valor*: lo comprometido, lo destacado, la marca.
3. **Calma, no alarma.** La plata ya da ansiedad. Avisos claros, sin rojo de más, sin signos de exclamación en cadena.
4. **Precisión argentina.** Pesos y dólares bien formateados, cuotas con su cierre real, fechas en es-AR. Nunca un número ambiguo.
5. **Sigue al sistema.** Claro u oscuro según el dispositivo; ambos temas son ciudadanos de primera.

## Voz y contenido

- **Voseo rioplatense, neutro en vocabulario.** "Cargá", "Fijate", "Te quedan". Evitamos lunfardo que no se entienda en LatAm (nada de "guita", "mango", "luca" en la UI).
- **Corto y concreto.** Verbos al principio, números exactos. Una idea por frase.
- **Sin culpa.** Describimos, no juzgamos: "Gastaste 18% más en delivery que en octubre", no "¡Te pasaste!".
- **Mayúsculas:** oración normal en títulos y botones ("Cargar gasto", no "Cargar Gasto"). `label` en mayúsculas solo para sobrelíneas cortas.
- **Emojis:** no en la UI. Sí con moderación en bots y redes.

| Situación | ✅ Así | ❌ Así no |
|---|---|---|
| Botón principal | Cargar gasto | Agregar nuevo gasto ahora |
| Estado vacío | Todavía no cargaste nada este mes. Probá con "café 2500". | ¡Ups! No hay datos para mostrar 😢 |
| Alerta de presupuesto | Vas por el 85% de Delivery y faltan 9 días. | ¡ATENCIÓN! Estás por superar tu presupuesto |
| Cuotas | 3 de 6 · próxima el 10/12 | Cuota número 3 de un total de 6 |
| Error | No pudimos guardar. Revisá la conexión y probá de nuevo. | Error 500: Internal Server Error |

## Números, monedas y fechas

- Pesos: `$ 128.450,50` (punto de miles, coma decimal, espacio fino o normal después del `$`). Sin decimales cuando son ,00 en listas: `$ 12.000`.
- Dólares: `US$ 250` (nunca `$` solo para USD). Cotización con su fuente: `Dólar MEP $ 1.512`.
- Siempre **cifras tabulares** (`font-variant-numeric: tabular-nums`) en montos, tablas y gráficos.
- Ingresos con signo `+` y `positive`; gastos sin signo en listas (es lo esperado), `−` solo cuando se mezclan en el mismo listado.
- Fechas: "Hoy", "Ayer", "Lun 10", "10/12/2026". Cierres y vencimientos: "Cierra el 24 · vence el 3".

## Color

La paleta está pensada para diferenciarse de la competencia (verdes, violetas, naranjas y celestes de billeteras y bancos): grafito + ámbar.

| Token | Para qué |
|---|---|
| `bg`, `surface`, `surface-2` | Fondos: página, tarjetas, rellenos sutiles. |
| `ink`, `ink-muted` | Texto principal y secundario. |
| `primary`, `on-primary` | La acción principal de cada pantalla (alias de `ink`). Una por pantalla. |
| `accent` | Ámbar de marca. **En tema claro solo como relleno con texto `ink` encima** (no como texto: 1,9:1). |
| `accent-ink` | El ámbar cuando tiene que ser texto, link o ícono. |
| `accent-soft` | Fondo teñido para avisos, tips y la tarjeta del plan. |
| `positive`, `negative` | Ingresos/pagado y excedido/error. Siempre con signo o ícono; difieren también en luminosidad. |
| `border`, `border-strong` | Divisores decorativos vs. bordes de controles (≥3:1). |
| `focus` | Solo el anillo de foco (2px, separación 2px). |
| `chart-1`, `chart-2`, `chart-3` | Series de gráficos cuando hay que distinguir varias (pizarra, salvia, terracota). Solo gráficos, nunca texto. |

Reglas:
- Una sola acción `primary` por pantalla; el resto, botones secundarios con `border-strong` o texto.
- Tema oscuro: tarjetas separadas con `border`, sin sombra (`shadow-card` es `none`).
- Gráficos: por defecto, series en `ink` y `ink-muted`, la serie destacada en `accent`. Cuando hay que distinguir varias series a la vez (por ejemplo, compras apiladas en una barra), usar `chart-1` (pizarra), `chart-2` (salvia) y `chart-3` (terracota), siempre con leyenda o etiqueta. Difieren en tono y en luminosidad, y no reemplazan a `accent` como resaltado. Nada de arcoíris: no más de esas tres.
- Contraste verificado en ambos temas: texto ≥4,5:1, controles e íconos ≥3:1.

## Tipografía

Una sola familia: **Manrope** (Google Fonts, variable 200–800), geométrica y legible en números chicos.

- `display-xl` / `display`: solo landing y onboarding, tracking negativo.
- `amount`: montos protagonistas, siempre tabulares.
- `title` → `heading` → `body` → `caption` → `label` en la app.
- Peso del cuerpo 450 (un poco más firme que 400 en pantallas chicas).
- Carga recomendada: `https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&display=swap`, o self-hosted en producción (`font-display: swap`).

## Espaciado y forma

- Grilla de 4px. Margen lateral mobile `space-4`; separación entre tarjetas `space-6`; ritmo de secciones en la landing `space-24` (64px en mobile).
- Radios generosos pero no infantiles: tarjetas `radius-lg`, inputs y botones `radius-md` o `radius-full` (pill), chips `radius-sm`.
- **Motivo de marca: la barra de cuotas.** Pills (`radius-full`) en fila que se llenan de `accent` a medida que se pagan. Es la forma que identifica a Valuo: aparece en la UI (progreso de cuotas, "Comprometido") y en la marca (portada, redes).

## Movimiento

Profesional y funcional: el movimiento explica qué cambió, nunca decora.

- `duration-fast` (120ms) feedback de toque · `duration-base` (220ms) hojas y tabs · `duration-slow` (420ms) conteo de números, dibujo de gráficos y revelados al hacer scroll en la landing.
- `ease-out` para entrar; `ease-in-out` para moverse entre posiciones.
- Solo `transform` y `opacity` (sin saltos de layout).
- Montos que cambian: conteo rápido con cifras tabulares, sin rebote.
- Respetar `prefers-reduced-motion`: sin conteos ni parallax; transiciones a fundido corto.
- Landing: narrativa al hacer scroll (la compra en cuotas que se reparte en los próximos resúmenes) con GSAP ScrollTrigger; transiciones de UI con Motion; scroll suave con Lenis.

## Marca

- **Nombre:** Valuo (siempre así: V mayúscula, sin tilde, sin "app" pegado). Dominio `valuo.ar`.
- **Logo (dirección 1B):** wordmark "valuo" en minúsculas, Manrope 800, tracking −0,04em, color `ink`, seguido de un punto perfectamente redondo en `accent` de 0,22em de diámetro, separado 0,05em y apoyado en la línea de base. El punto es la firma: nunca cambia de color y nunca se reemplaza por un emoji o un ícono.
- **Ícono / isotipo:** una "v" de trazo redondeado (grosor 10/64 del cuadro) con el punto ámbar grande a la derecha, sobre un cuadrado redondeado `ink` (radio 25% del lado). Versión alternativa sobre `accent` con la v en tinta y el punto en blanco, solo para marketing. Se usa para el ícono de la app, el favicon y los avatares en redes.
- **Versiones:** tema claro (tinta `#111214` + punto `#F2A900`), tema oscuro (tinta `#F4F4F2` + punto `#F5B53F`) y monocromo (todo `ink`) solo donde no hay color.
- **Tamaños mínimos:** wordmark 72px de ancho en pantalla; ícono 16px (favicon).
- **Tagline:** "Sabé cuánto vale tu mes."
- **Área de resguardo:** la altura de la "v" alrededor del wordmark.
- **Archivos:** usá siempre los SVG de `logo/` e `icons/` (texto convertido a curvas). Nunca recrees el logo escribiendo "valuo" con la fuente.

## Iconografía

- **Lucide** (trazo 1.75px, puntas redondeadas) como única librería; la app actual usa dos y se unifica en el rediseño.
- Tamaños 20px (UI) y 24px (navegación). Color `ink` o `ink-muted`; `accent-ink` solo para el ícono activo destacado.
- Sin íconos de colores ni emojis en la UI.

## No hacer

- Degradados violeta-azul, glassmorphism, tarjetas con borde de color a la izquierda, emojis en tarjetas.
- Usar `accent` como texto sobre fondo claro.
- Comunicar ganancia/pérdida solo con color.
- Más de una acción primaria por pantalla.
- Animaciones que demoren al usuario más de 420ms.
