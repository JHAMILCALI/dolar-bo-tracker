# scrape.py — Dólar Bolivia Hoy

Script de Python que hace scraping de [dolarboliviahoy.com](https://dolarboliviahoy.com/) y persiste el historial en `public/data/db.json`.

---

## Requisitos

- Python 3.10 o superior

## Instalación

```bash
# Desde la raíz del proyecto
pip install -r scripts/requirements.txt
```

## Uso

```bash
# Desde la raíz del proyecto
python scripts/scrape.py
```

## Variables de entorno opcionales

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `TARGET_URL` | URL objetivo | `https://dolarboliviahoy.com/` |
| `TIMEOUT_SECONDS` | Tiempo límite HTTP | `30` |
| `DUPLICATE_WINDOW` | Ventana anti-duplicados (segundos) | `600` |
| `USER_AGENT` | User-Agent HTTP | Chrome 124 |

---

## Estrategia de extracción

El script intenta extraer `compra` y `venta` en tres capas:

1. **Tablas HTML** — busca `<table>` con filas etiquetadas "Compra" / "Venta"
2. **Proximidad DOM** — busca la etiqueta en cualquier nodo de texto y extrae el número más cercano
3. **Regex sobre texto plano** — último recurso sobre el texto completo de la página

---

## Si la página requiere JavaScript (Playwright)

Si el script no extrae precios (la web puede renderizarlos con JS), instala Playwright:

```bash
pip install playwright
playwright install chromium
```

Luego reemplaza la función `fetch_page` por:

```python
from playwright.sync_api import sync_playwright

def fetch_page(url: str) -> str:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, timeout=TIMEOUT_SECONDS * 1000)
        page.wait_for_load_state("networkidle")
        html = page.content()
        browser.close()
    return html
```

---

## Estructura de `db.json`

```json
{
  "lastUpdated": "2026-03-31T14:30:00.000000+00:00",
  "source": "https://dolarboliviahoy.com/",
  "records": [
    {
      "timestamp": "2026-03-31T14:30:00.000000+00:00",
      "compra": 6.86,
      "venta": 6.97
    }
  ]
}
```

## Logs de ejemplo

```
2026-03-31T14:30:00 [INFO] === Inicio del scraping ===
2026-03-31T14:30:00 [INFO] URL objetivo: https://dolarboliviahoy.com/
2026-03-31T14:30:01 [INFO] Respuesta recibida. Código HTTP: 200 | Tamaño: 45231 bytes
2026-03-31T14:30:01 [INFO] Precios extraídos → compra: 6.86 BOB | venta: 6.97 BOB
2026-03-31T14:30:01 [INFO] db.json cargado. Registros existentes: 5
2026-03-31T14:30:01 [INFO] Nuevo registro añadido: {"timestamp": "...", "compra": 6.86, "venta": 6.97}
2026-03-31T14:30:01 [INFO] db.json guardado en: C:\...\public\data\db.json
2026-03-31T14:30:01 [INFO] === Scraping completado exitosamente ===
```
