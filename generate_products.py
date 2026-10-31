import csv, json, re

def clean_float(val, default=0.0):
    if not val: return default
    try:
        c = re.sub(r'[^\d.]', '', val.replace(',', '.'))
        return float(c) if c else default
    except:
        return default

def clean_int(val, default=0):
    if not val: return default
    try:
        c = re.sub(r'[^\d]', '', val)
        return int(c) if c else default
    except:
        return default

IMAGES = {
    'oring': [
        'https://images.unsplash.com/photo-1618764400608-9e7115eabb74?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ],
    'nivelador': [
        'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=800&q=80'
    ],
    'cuna': [
        'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?auto=format&fit=crop&w=800&q=80'
    ],
    'trailer': [
        'https://images.unsplash.com/photo-1558441719-8b489c63f7d1?auto=format&fit=crop&w=800&q=80'
    ],
    'pvc_valvula': [
        'https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=800&q=80'
    ],
    'pvc_tubo': [
        'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80'
    ],
    'manija': [
        'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    'bocallave': [
        'https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=800&q=80'
    ],
    'herramienta': [
        'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=800&q=80'
    ],
    'rodachin': [
        'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80'
    ],
    'rejilla': [
        'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80'
    ],
    'tapon': [
        'https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=800&q=80'
    ],
    'cadena': [
        'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80'
    ],
    'general': [
        'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'
    ]
}

def get_product_images(name):
    nl = name.lower()
    if 'oring' in nl or 'sello' in nl:
        return IMAGES['oring']
    elif 'nivelador' in nl:
        return IMAGES['nivelador']
    elif 'cuña' in nl or 'cuna' in nl:
        return IMAGES['cuna']
    elif 'trailer' in nl or 'rin' in nl:
        return IMAGES['trailer']
    elif any(k in nl for k in ['llave bola', 'válvula', 'valvula', 'cheque']):
        return IMAGES['pvc_valvula']
    elif any(k in nl for k in ['pvc', 'codo', 'buje', 'niple', 'te ', 'unión', 'union', 'inserto', 'adap']):
        return IMAGES['pvc_tubo']
    elif any(k in nl for k in ['manija', 'pasador', 'pechero', 'bisagra', 'portachapa', 'hd 65', 'hd 66']):
        return IMAGES['manija']
    elif 'bocallave' in nl or 'rombo' in nl:
        return IMAGES['bocallave']
    elif any(k in nl for k in ['rodachin', 'rodachina', 'polea']):
        return IMAGES['rodachin']
    elif any(k in nl for k in ['rejilla', 'sifón', 'sifon', 'sosco', 'tragante', 'pozuelo']):
        return IMAGES['rejilla']
    elif any(k in nl for k in ['tapón', 'tapon', 'tapa hueco', 'moneda']):
        return IMAGES['tapon']
    elif any(k in nl for k in ['cincel', 'hacha', 'calabozo', 'patecabra', 'arrancador', 'busarda', 'recaton', 'sembrador', 'llana']):
        return IMAGES['herramienta']
    elif 'cadena' in nl:
        return IMAGES['cadena']
    return IMAGES['general']

def categorize(name):
    nl = name.lower()
    if 'sello oring' in nl or 'oring' in nl:
        return ('sellos-orings', 'Sellos & O-Rings Industriales')
    elif any(k in nl for k in ['bocallave', 'manija', 'bisagra', 'pasador', 'pechero', 'portachapa', 'hd 65', 'hd 66', 'rombo', 'piña']):
        return ('herrajes-seguridad', 'Herrajes, Cerraduras & Manijas')
    elif any(k in nl for k in ['pvc', 'codo', 'buje', 'cheque', 'ducha', 'empaque', 'inserto', 'llave bola', 'niple', 'pozuelo', 'racor', 'sifón', 'sifon', 'sosco', 'te ', 'te pres', 'tragante', 'tubo de enlace', 'unión', 'union', 'válvula', 'valvula', 'adap']):
        return ('plomeria-pvc', 'Plomería & Conexiones PVC')
    elif any(k in nl for k in ['cincel', 'hacha', 'arrancador', 'calabozo', 'llana', 'patecabra', 'sembrador', 'recaton', 'camisa de acero', 'suela', 'busarda', 'bicheroqui']):
        return ('herramientas-agro', 'Herramientas & Taller')
    else:
        return ('ferreteria-industrial', 'Ferretería & Construcción')

products = []

with open('/Users/andres/.gemini/antigravity/scratch/aura-store/database_productos.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    idx = 1
    for row in reader:
        name = row.get('PRODUCTOS', '').strip()
        if not name or name == 'PRODUCTOS':
            continue
        
        qty = clean_int(row.get('CANTIDAD', '0'))
        p_iva = clean_float(row.get('PRECIO DE VENTA (+IVA)', ''))
        p_venta = clean_float(row.get('PRECIO DE VENTA', ''))
        p_compra = clean_float(row.get('PRECIO DE COMPRA UNIDAD', ''))
        provider = row.get('PROVEEDRES', '').strip() or 'Fabricante Industrial'

        price = p_iva if p_iva > 0 else (p_venta if p_venta > 0 else (p_compra * 1.30 if p_compra > 0 else 1000.0))
        price = round(price, 2)
        old_price = round(price * 1.20, 2)
        
        cat_id, cat_name = categorize(name)
        imgs = get_product_images(name)

        is_flash = (idx % 9 == 0) and qty > 0
        is_best = (idx % 7 == 0)
        is_new = (idx % 11 == 0)

        # Rating between 4.7 and 5.0
        rating = round(4.7 + ((idx * 7) % 4) * 0.1, 1)
        reviews = 15 + ((idx * 31) % 180)

        p_obj = {
            "id": f"art-{idx:03d}",
            "name": name,
            "subtitle": f"Pieza técnica de alta calidad para {cat_name.lower()}",
            "category": cat_id,
            "categoryName": cat_name,
            "price": price,
            "oldPrice": old_price,
            "discount": "-17%",
            "rating": rating,
            "reviewsCount": reviews,
            "isFlashDeal": is_flash,
            "isBestSeller": is_best,
            "isNew": is_new,
            "stock": qty,
            "provider": provider,
            "colors": [
                {"name": "Estándar Fabril", "hex": "#475569"},
                {"name": "Negro Mate", "hex": "#1E293B"}
            ],
            "sizes": ["Medida Única / Estándar"],
            "images": imgs,
            "description": f"Producto certificado de grado profesional para {cat_name.lower()}. Fabricado con los más altos estándares de resistencia y durabilidad bajo especificaciones industriales de {provider}.",
            "specs": [
                f"Referencia de almacén: ART-{idx:04d}",
                f"Disponibilidad en bodega: {qty} unidades",
                f"Línea: {cat_name}",
                f"Distribuidor / Proveedor: {provider}",
                "Control de calidad verificado"
            ]
        }
        products.append(p_obj)
        idx += 1

print(f"Parsed {len(products)} products.")

# Build categories list
cat_counts = {}
for p in products:
    c = p['category']
    cat_counts[c] = cat_counts.get(c, 0) + 1

categories = [
    {"id": "todas", "name": "Todos los Productos", "icon": "sparkles", "count": len(products)},
    {"id": "plomeria-pvc", "name": "Plomería & Conexiones PVC", "icon": "droplet", "count": cat_counts.get("plomeria-pvc", 0)},
    {"id": "sellos-orings", "name": "Sellos & O-Rings", "icon": "disc", "count": cat_counts.get("sellos-orings", 0)},
    {"id": "herrajes-seguridad", "name": "Herrajes & Manijas", "icon": "key", "count": cat_counts.get("herrajes-seguridad", 0)},
    {"id": "ferreteria-industrial", "name": "Ferretería & Construcción", "icon": "wrench", "count": cat_counts.get("ferreteria-industrial", 0)},
    {"id": "herramientas-agro", "name": "Herramientas & Taller", "icon": "hammer", "count": cat_counts.get("herramientas-agro", 0)}
]

js_content = f"""// Catálogo de Productos Oficial de Ferretería & Industria
// Base de datos sincronizada: {len(products)} artículos reales

const BASE_PRODUCTS = {json.dumps(products, indent=2, ensure_ascii=False)};

// Monedas Internacionales soportadas (Base en COP - Peso Colombiano)
const CURRENCIES = {{
  COP: {{ code: 'COP', symbol: '$', rate: 1.0, flag: '🇨🇴', name: 'Peso Colombiano (COP $)', position: 'before', decimals: 0 }},
  USD: {{ code: 'USD', symbol: '$', rate: 0.00025, flag: '🇺🇸', name: 'US Dollar (USD $)', position: 'before', decimals: 2 }},
  EUR: {{ code: 'EUR', symbol: '€', rate: 0.00023, flag: '🇪🇸', name: 'Euro (EUR €)', position: 'after', decimals: 2 }},
  MXN: {{ code: 'MXN', symbol: '$', rate: 0.0050, flag: '🇲🇽', name: 'Peso Mexicano (MXN $)', position: 'before', decimals: 2 }},
  ARS: {{ code: 'ARS', symbol: '$', rate: 0.285, flag: '🇦🇷', name: 'Peso Argentino (ARS $)', position: 'before', decimals: 0 }},
  CLP: {{ code: 'CLP', symbol: '$', rate: 0.244, flag: '🇨🇱', name: 'Peso Chileno (CLP $)', position: 'before', decimals: 0 }},
  GBP: {{ code: 'GBP', symbol: '£', rate: 0.000196, flag: '🇬🇧', name: 'British Pound (GBP £)', position: 'before', decimals: 2 }},
  JPY: {{ code: 'JPY', symbol: '¥', rate: 0.0385, flag: '🇯🇵', name: 'Japanese Yen (JPY ¥)', position: 'before', decimals: 0 }}
}};

// Países para Selector de Región Global
const COUNTRIES = [
  {{ code: 'CO', name: 'Colombia', flag: '🇨🇴', currency: 'COP' }},
  {{ code: 'ES', name: 'España', flag: '🇪🇸', currency: 'EUR' }},
  {{ code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' }},
  {{ code: 'MX', name: 'México', flag: '🇲🇽', currency: 'MXN' }},
  {{ code: 'AR', name: 'Argentina', flag: '🇦🇷', currency: 'ARS' }},
  {{ code: 'CL', name: 'Chile', flag: '🇨🇱', currency: 'CLP' }},
  {{ code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' }}
];

// Categorías del sistema
const CATEGORIES = {json.dumps(categories, indent=2, ensure_ascii=False)};

// Cupones activos para la tienda
const ACTIVE_COUPONS = {{
  "BIENVENIDA": {{ discountPercent: 10, description: "10% de descuento en tu primer pedido" }},
  "FERRETERIA": {{ discountPercent: 15, description: "15% de descuento especial clientes" }},
  "MAYORISTA": {{ discountPercent: 20, description: "20% de descuento para pedidos al por mayor" }},
  "AURA10": {{ discountPercent: 10, description: "10% de descuento especial" }}
}};

// Función para obtener productos fusionando con ediciones personalizadas guardadas en localStorage
function getStoreProducts() {{
  try {{
    const customData = localStorage.getItem('aura_custom_products');
    if (customData) {{
      const customProducts = JSON.parse(customData);
      if (Array.isArray(customProducts) && customProducts.length > 0) {{
        return customProducts;
      }}
    }}
  }} catch (e) {{
    console.warn("Error cargando productos personalizados:", e);
  }}
  return [...BASE_PRODUCTS];
}}

let PRODUCTS = getStoreProducts();
"""

with open('/Users/andres/.gemini/antigravity/scratch/aura-store/products.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

print("products.js updated successfully with all real products!")
