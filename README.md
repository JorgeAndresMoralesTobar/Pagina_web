# Distribuciones Alumax JT 🌐✨
### Plataforma de Comercio Electrónico Ferretero & Suministros Industriales

Catálogo oficial para **Distribuciones Alumax JT**, diseñado al nivel visual y de ingeniería de gigantes como **Amazon, Nike, Apple y El Corte Inglés**. Preparado para que tus clientes puedan consultar más de 420 productos con imágenes en alta resolución, precios oficiales, carrito deslizable, buscador predictivo y selector de moneda mundial.

---

## 🚀 Características Principales

1. **Diseño de Interfaz "Grandiosa" & Alta Gama:**
   - Tipografía refinada: *Plus Jakarta Sans* combinada con *Syne* para titulares de lujo.
   - Efectos Glassmorphism, sombras sutiles con elevación suave al pasar el cursor y micro-animaciones interactivas.
   - Paleta de color minimalista y sofisticada (Slate 950, Blanco Puro, Acentos Azul Cobalto y Oro).

2. **Catálogo de Productos con Imágenes Reales en Alta Definición:**
   - Cada producto cuenta con fotografía comercial en alta resolución, nombre, subtítulo descriptivo, precio, precio original tachado, porcentaje de descuento, etiquetas de novedad / más vendido / oferta flash.
   - Selector visual de variantes de color (swatches).
   - Selector interactivo de tallas / versiones (EU 40 a 45, S a XXL, etc.).
   - Indicador dinámico de stock ("En stock" / "¡Quedan pocas unidades!").

3. **Filtrado & Búsqueda Instantánea en Tiempo Real:**
   - Barra de búsqueda predictiva estilo *Apple / Amazon Omnibar* (con atajo de teclado `⌘K`).
   - Filtrado interactivo por categorías (*Sneakers, Audio Pro, Tecnología & Wearables, Moda, Accesorios, Hogar*).
   - Ordenación por recomendados, mayor descuento, más vendidos, mejor valorados y precio (menor a mayor / mayor a menor).

4. **Experiencia de Detalle "Quick View" (Vista Rápida):**
   - Modal con galería de miniaturas interactiva.
   - Selector de variantes, cantidad y especificaciones técnicas completas.
   - Botón directo de compra inmediata.

5. **Slide-Over Shopping Cart (Cesta Lateral Deslizable):**
   - Barra de progreso dinámica para **Envío Gratis** (ej. *"Añade 25,00 € más para envío gratis"*).
   - Control de cantidades individual (+ / -), precio unitario y eliminación de productos.
   - Motor de cupones promocionales con validación instantánea (Prueba con `VIP20`, `AURA10` o `AMAZON`).
   - Cálculo automático de subtotal, descuentos, gastos de envío e IVA.

6. **Pasarela de Pago Completa (Simulación de Checkout 3 Pasos):**
   - Paso 1: Dirección y datos de entrega con validación.
   - Paso 2: Selección de método de pago (Tarjeta bancaria interactiva, Apple Pay, Klarna en 3 plazos sin intereses).
   - Paso 3: Confirmación de pedido con animación de **confeti en pantalla**, generación de número de pedido rastreable (`AUR-XXXXXX`) y resumen.

7. **Lista de Deseos (Wishlist):**
   - Guarda productos favoritos en memoria local (`localStorage`) con un solo clic.

8. **Ofertas Flash con Cuenta Regresiva Activa:**
   - Temporizador dinámico de horas, minutos y segundos al estilo de los *Lightning Deals de Amazon* y *Días de Oro de El Corte Inglés*.

---

## 📂 Estructura de Archivos

```
aura-store/
├── index.html        # Estructura semántica HTML5 con Tailwind CSS
├── styles.css        # Estilos visuales personalizados, animaciones y glassmorphism
├── products.js       # Base de datos y catálogo de productos premium
├── app.js            # Lógica completa de carrito, filtros, búsqueda, wishlist y pasarela
└── README.md         # Documentación y guía de personalización
```

---

## ⚡ Cómo Abrir y Usar la Página Web

Puedes abrir la tienda directamente en tu navegador favorito (Safari, Google Chrome, Firefox, Edge, etc.):

### Opción 1: Con un solo comando en la terminal de tu Mac
```bash
open /Users/andres/.gemini/antigravity/scratch/aura-store/index.html
```

### Opción 2: Servidor local ligero
Si prefieres servirlo como un servidor web HTTP:
```bash
cd /Users/andres/.gemini/antigravity/scratch/aura-store
python3 -m http.server 8080
```
Luego abre tu navegador en: `http://localhost:8080`

---

## 🎨 Cómo Personalizar Productos y Marca

1. **Añadir o cambiar productos:**
   Edita el archivo `products.js`. Puedes modificar nombres, precios, imágenes (cualquier URL de Unsplash, Cloudinary, AWS S3 o fotos de tus productos locales) y descripciones.

2. **Cambiar Cupones de Descuento:**
   En `products.js`, en la sección `ACTIVE_COUPONS`, puedes crear nuevos cupones con el porcentaje que desees.

3. **Conectar a Pagos Reales (Stripe / Shopify / PayPal):**
   En `app.js`, la función `processPaymentOrder()` está preparada para que puedas conectar directamente la API de Stripe Checkout, PayPal SDK o tu backend en Node.js/Python.
