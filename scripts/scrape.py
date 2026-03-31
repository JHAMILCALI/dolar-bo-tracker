"""
scrape.py
---------
Hace web scraping de https://dolarboliviahoy.com/ para obtener el precio
de compra y venta del dólar en Bolivia y lo persiste en public/data/db.json.

Uso (desde la raíz del proyecto):
    python scripts/scrape.py

Variables de entorno opcionales:
    TARGET_URL       – URL objetivo (por defecto dolarboliviahoy.com)
    TIMEOUT_SECONDS  – Tiempo límite de la petición HTTP (por defecto 30)
    DUPLICATE_WINDOW – Ventana en segundos para detectar duplicados (por defecto 600)
    USER_AGENT       – User-Agent HTTP personalizado
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger(__name__)

# Rutas (relativas a la raíz del proyecto — un nivel arriba de /scripts)
SCRIPT_DIR: Path = Path(__file__).parent
PROJECT_ROOT: Path = SCRIPT_DIR.parent
DB_PATH: Path = PROJECT_ROOT / "public" / "data" / "db.json"

# Parámetros configurables por entorno
URL: str = os.getenv("TARGET_URL", "https://dolarboliviahoy.com/")
TIMEOUT_SECONDS: int = int(os.getenv("TIMEOUT_SECONDS", "30"))
DUPLICATE_WINDOW: int = int(os.getenv("DUPLICATE_WINDOW", "600"))  # 10 minutos
USER_AGENT: str = os.getenv(
    "USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36",
)

# ---------------------------------------------------------------------------
# Patrones de búsqueda por CSS selector
# Cada entrada es (selector_contenedor, campo).
# El script recorre los bloques de la página y busca "Compra"/"Venta"
# en el texto del siguiente/mismo elemento.
# ---------------------------------------------------------------------------

# Selectores específicos comunes en sitios bolivianos de tipo de cambio
CSS_SELECTORS: list[tuple[str, str]] = [
    # Tablas con encabezado Compra / Venta
    ("table", "table"),
    # Tarjetas / bloques de precio
    (".compra, .venta, .buy, .sell, .precio-compra, .precio-venta", "card"),
    # Generico con etiqueta + valor en el mismo bloque
    (".price-box, .exchange-rate, .dolar-compra, .dolar-venta", "box"),
]

# Patrones regex como último recurso sobre el texto plano de la página
COMPRA_PATTERNS: list[str] = [
    r"compra\s*[:\-]?\s*([\d]+[.,][\d]+)",
    r"precio\s+de\s+compra\s*[:\-]?\s*([\d]+[.,][\d]+)",
    r"buy\s*[:\-]?\s*([\d]+[.,][\d]+)",
    r"([\d]+[.,][\d]+)\s*(?:bs\.?|bob).*?compra",
]

VENTA_PATTERNS: list[str] = [
    r"venta\s*[:\-]?\s*([\d]+[.,][\d]+)",
    r"precio\s+de\s+venta\s*[:\-]?\s*([\d]+[.,][\d]+)",
    r"sell\s*[:\-]?\s*([\d]+[.,][\d]+)",
    r"([\d]+[.,][\d]+)\s*(?:bs\.?|bob).*?venta",
]

# Rango válido de precios para USD/BOB (guard rail de sanidad)
MIN_PRICE: float = 5.0
MAX_PRICE: float = 20.0

# Exchanges conocidos en Bolivia para búsqueda por proximidad
EXCHANGE_NAMES: list[str] = ["Binance", "Bybit", "Bitget", "DoradoP2P", "Airtm"]


# ---------------------------------------------------------------------------
# Fetch con Playwright (necesario: la web carga los precios via JavaScript)
# ---------------------------------------------------------------------------

def fetch_page(url: str) -> str:
    """
    Usa Playwright (Chromium headless) para cargar la página y esperar a que
    JavaScript rellene los precios reales antes de devolver el HTML final.
    """
    log.info("Iniciando Playwright (Chromium headless)...")
    log.info("Cargando: %s", url)

    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=USER_AGENT,
                locale="es-BO",
                extra_http_headers={
                    "Accept-Language": "es-BO,es;q=0.9,en;q=0.7",
                    "Cache-Control": "no-cache",
                },
            )
            page = context.new_page()

            try:
                page.goto(url, timeout=TIMEOUT_SECONDS * 1000, wait_until="domcontentloaded")

                # Esperar a que JS rellene los precios (deben ser > 0)
                log.info("Esperando que JavaScript cargue los precios...")
                page.wait_for_function(
                    """
                    () => {
                        const text = document.body ? document.body.innerText : '';
                        const match = text.match(/compra[\\s\\S]{0,30}?([0-9]+[.,][0-9]+)/i);
                        if (!match) return false;
                        const val = parseFloat(match[1].replace(',', '.'));
                        return val > 0.01;
                    }
                    """,
                    timeout=20000,
                )
                log.info("Precios detectados en el DOM. Extrayendo HTML...")

            except PlaywrightTimeout:
                log.warning(
                    "Timeout esperando precios JS. Se intentará parsear el HTML disponible."
                )

            html = page.content()
            log.info("HTML obtenido. Tamaño: %d bytes", len(html))
            return html

    except PlaywrightTimeout as exc:
        raise RuntimeError(f"Timeout al cargar la página con Playwright: {url}") from exc
    except Exception as exc:
        raise RuntimeError(f"Error de Playwright al acceder a {url}: {exc}") from exc


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_decimal(raw: str | None) -> float | None:
    """Convierte una cadena con posibles comas/puntos a float."""
    if not raw:
        return None
    cleaned = raw.strip().replace(" ", "").replace("\xa0", "")

    # Formato europeo: 6.96 → ya es correcto; 6,96 → convertir coma
    if "," in cleaned and "." in cleaned:
        # El separador de miles es el que aparece primero
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")

    # Eliminar caracteres no numéricos residuales excepto el punto decimal
    cleaned = re.sub(r"[^\d.]", "", cleaned)

    try:
        value = float(cleaned)
        return round(value, 4)
    except ValueError:
        return None


def _first_regex_match(patterns: list[str], text: str) -> float | None:
    """Aplica una lista de patrones regex y devuelve el primer float válido."""
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            value = parse_decimal(match.group(1))
            if value is not None and MIN_PRICE <= value <= MAX_PRICE:
                return value
    return None


def _extract_via_table(soup: BeautifulSoup) -> tuple[float | None, float | None]:
    """
    Busca tablas en la página y detecta filas con etiquetas compra/venta
    para extraer los valores numéricos adyacentes.
    """
    compra: float | None = None
    venta: float | None = None

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        for row in rows:
            cells = [c.get_text(strip=True) for c in row.find_all(["td", "th"])]
            if not cells:
                continue
            row_text = " ".join(cells).lower()
            if "compra" in row_text:
                # El valor numérico suele estar en la celda siguiente a la etiqueta
                for cell_text in cells:
                    v = parse_decimal(cell_text)
                    if v is not None and MIN_PRICE <= v <= MAX_PRICE:
                        compra = v
                        break
            if "venta" in row_text:
                for cell_text in cells:
                    v = parse_decimal(cell_text)
                    if v is not None and MIN_PRICE <= v <= MAX_PRICE:
                        venta = v
                        break

    return compra, venta


def _extract_via_proximity(soup: BeautifulSoup) -> tuple[float | None, float | None]:
    """
    Recorre todos los elementos de texto de la página buscando la palabra
    'compra' o 'venta' y extrae el número más cercano en el entorno DOM.
    """
    compra: float | None = None
    venta: float | None = None

    for element in soup.find_all(string=re.compile(r"\b(compra|venta)\b", re.IGNORECASE)):
        label = element.strip().lower()
        # Buscar número en el padre o hermano siguiente
        parent = element.parent
        if parent is None:
            continue

        # Intentar en el texto del padre completo
        full_text = parent.get_text(" ", strip=True)
        numbers = re.findall(r"[\d]+[.,][\d]+", full_text)
        candidates = [parse_decimal(n) for n in numbers]
        valid = [c for c in candidates if c is not None and MIN_PRICE <= c <= MAX_PRICE]

        if not valid:
            # Intentar en el hermano siguiente
            sibling = parent.find_next_sibling()
            if sibling:
                sib_text = sibling.get_text(strip=True)
                v = parse_decimal(re.sub(r"[^0-9.,]", "", sib_text))
                if v is not None and MIN_PRICE <= v <= MAX_PRICE:
                    valid = [v]

        if valid:
            if "compra" in label and compra is None:
                compra = valid[0]
            elif "venta" in label and venta is None:
                venta = valid[0]

        if compra is not None and venta is not None:
            break

    return compra, venta


def extract_prices(html: str) -> tuple[float, float]:
    """
    Estrategia en capas para extraer compra y venta:
      1. Búsqueda en tablas HTML
      2. Búsqueda por proximidad en el DOM
      3. Regex sobre texto plano (último recurso)

    Lanza ValueError si no se pueden obtener ambos valores válidos.
    """
    soup = BeautifulSoup(html, "html.parser")
    plain_text = soup.get_text(" ", strip=True)

    log.debug("Iniciando extracción mediante estrategia: tabla")
    compra, venta = _extract_via_table(soup)

    if compra is None or venta is None:
        log.debug("Tabla insuficiente. Probando estrategia: proximidad DOM")
        c2, v2 = _extract_via_proximity(soup)
        compra = compra or c2
        venta = venta or v2

    if compra is None or venta is None:
        log.debug("Proximidad insuficiente. Probando estrategia: regex sobre texto plano")
        compra = compra or _first_regex_match(COMPRA_PATTERNS, plain_text)
        venta = venta or _first_regex_match(VENTA_PATTERNS, plain_text)

    if compra is None or venta is None:
        # Log del texto para facilitar el diagnóstico
        snippet = plain_text[:500].replace("\n", " ")
        log.error("No se pudieron extraer los precios. Fragmento del texto: %s …", snippet)
        raise ValueError(
            "No se pudo extraer compra/venta de la página. "
            "Posibles causas: la web cambió su estructura, bloqueo de bot, o renderizado dinámico. "
            "Considera usar Playwright (ver README.md)."
        )

    log.info("Precios extraídos → compra: %s BOB | venta: %s BOB", compra, venta)
    return compra, venta


# ---------------------------------------------------------------------------
# Extracción de tabla "Comparativa de Exchanges"
# ---------------------------------------------------------------------------

def _parse_exchange_table(table: Any) -> list[dict[str, Any]]:
    """Parsea un elemento <table> de BeautifulSoup buscando nombre/compra/venta."""
    results: list[dict[str, Any]] = []
    headers: list[str] = []

    thead = table.find("thead")
    if thead:
        headers = [c.get_text(strip=True).lower() for c in thead.find_all(["th", "td"])]
    else:
        first_row = table.find("tr")
        if first_row:
            headers = [c.get_text(strip=True).lower() for c in first_row.find_all(["th", "td"])]

    name_idx   = next((i for i, h in enumerate(headers) if "exchange" in h or "nombre" in h), 0)
    compra_idx = next((i for i, h in enumerate(headers) if "compra" in h), 1)
    venta_idx  = next((i for i, h in enumerate(headers) if "venta" in h), 2)

    tbody = table.find("tbody")
    rows  = tbody.find_all("tr") if tbody else table.find_all("tr")[1:]

    for row in rows:
        cells = row.find_all(["td", "th"])
        if len(cells) <= max(compra_idx, venta_idx):
            continue

        name = re.sub(r"\s+", " ", cells[name_idx].get_text(strip=True)).strip() if name_idx < len(cells) else ""
        if not name:
            continue

        def _safe_price(idx: int) -> float | None:
            if idx >= len(cells):
                return None
            raw = re.sub(r"[^0-9.,]", "", cells[idx].get_text(strip=True))
            val = parse_decimal(raw)
            return val if val is not None and MIN_PRICE <= val <= MAX_PRICE else None

        url: str | None = None
        for cell in cells:
            link = cell.find("a", href=True)
            if link:
                url = link.get("href")
                break

        results.append({
            "name":   name,
            "compra": _safe_price(compra_idx),
            "venta":  _safe_price(venta_idx),
            "url":    url,
        })

    return results


def _extract_exchanges_by_proximity(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """
    Fallback: recorre el DOM buscando los nombres conocidos de exchanges
    y extrae los precios de compra/venta del contenedor más cercano.
    """
    results: list[dict[str, Any]] = []
    found_names: set[str] = set()

    for xname in EXCHANGE_NAMES:
        pattern = re.compile(re.escape(xname), re.IGNORECASE)
        for elem in soup.find_all(string=pattern):
            parent = elem.parent
            if parent is None:
                continue
            # Sube hasta 3 niveles para abarcar el bloque del exchange
            container = parent
            for _ in range(3):
                if container.parent:
                    container = container.parent
                else:
                    break

            container_text = container.get_text(" ", strip=True)
            numbers = re.findall(r"[\d]+[.,][\d]+", container_text)
            valid_prices = [
                v for n in numbers
                if (v := parse_decimal(n)) is not None and MIN_PRICE <= v <= MAX_PRICE
            ]

            if len(valid_prices) >= 2 and xname not in found_names:
                found_names.add(xname)
                link = container.find("a", href=True)
                results.append({
                    "name":   xname,
                    "compra": valid_prices[0],
                    "venta":  valid_prices[1],
                    "url":    link.get("href") if link else None,
                })
                break

    return results


def extract_exchanges(html: str) -> list[dict[str, Any]]:
    """
    Extrae la tabla 'Comparativa de Exchanges' de la página.
    Retorna lista de dicts: [{name, compra, venta, url}]
    No lanza excepción — los datos de exchanges son opcionales.
    """
    try:
        soup = BeautifulSoup(html, "html.parser")

        # Estrategia 1: encabezado "Comparativa de Exchanges" → siguiente <table>
        for tag in soup.find_all(["h2", "h3", "h4", "p", "div"]):
            if re.search(r"comparativa\s+de\s+exchanges?", tag.get_text(), re.IGNORECASE):
                table = tag.find_next("table")
                if table:
                    results = _parse_exchange_table(table)
                    if results:
                        log.info("Exchanges (tabla comparativa): %d filas", len(results))
                        return results
                break

        # Estrategia 2: cualquier tabla que tenga columnas compra + venta
        for table in soup.find_all("table"):
            text = table.get_text().lower()
            if "compra" in text and "venta" in text:
                results = _parse_exchange_table(table)
                if results and len(results) >= 2:
                    log.info("Exchanges (tabla genérica): %d filas", len(results))
                    return results

        # Estrategia 3: proximidad por nombre de exchange conocido
        results = _extract_exchanges_by_proximity(soup)
        if results:
            log.info("Exchanges (proximidad DOM): %d", len(results))
        else:
            log.warning("Exchanges no encontrados — db.json se guardará sin ese campo.")
        return results

    except Exception as exc:  # noqa: BLE001
        log.warning("Error extrayendo exchanges (no crítico): %s", exc)
        return []

def load_db(path: Path) -> dict[str, Any]:
    """Carga el archivo db.json o devuelve una estructura vacía válida."""
    if not path.exists():
        log.warning("db.json no encontrado en %s. Se creará uno nuevo.", path)
        return {
            "lastUpdated": None,
            "source": URL,
            "records": [],
        }

    try:
        with path.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
        log.info("db.json cargado. Registros existentes: %d", len(data.get("records", [])))
        return data
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"db.json está corrupto o no es JSON válido: {exc}") from exc


def is_duplicate(records: list[dict[str, Any]], compra: float, venta: float) -> bool:
    """
    Devuelve True si el último registro tiene exactamente los mismos precios
    Y su timestamp está dentro de la ventana DUPLICATE_WINDOW (segundos).
    """
    if not records:
        return False

    last = records[-1]
    same_prices = (last.get("compra") == compra and last.get("venta") == venta)

    if not same_prices:
        return False

    try:
        last_time = datetime.fromisoformat(last["timestamp"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta = abs((now - last_time).total_seconds())
        if delta < DUPLICATE_WINDOW:
            log.warning(
                "Registro duplicado detectado (mismos precios, delta=%ds < %ds). Se omite.",
                int(delta),
                DUPLICATE_WINDOW,
            )
            return True
    except (KeyError, ValueError) as exc:
        log.debug("No se pudo comparar timestamps: %s", exc)

    return False


def append_record(
    db: dict[str, Any],
    compra: float,
    venta: float,
    exchanges: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Añade un nuevo registro al historial, actualiza exchanges, lastUpdated y source."""
    now_iso = datetime.now(timezone.utc).isoformat()

    new_record: dict[str, Any] = {
        "timestamp": now_iso,
        "compra": compra,
        "venta": venta,
    }

    db.setdefault("records", [])
    db["records"].append(new_record)
    db["lastUpdated"] = now_iso
    db["source"] = URL

    if exchanges is not None:
        db["exchanges"] = exchanges

    log.info("Nuevo registro añadido: %s", json.dumps(new_record, ensure_ascii=False))
    log.info("Total de registros en historial: %d", len(db["records"]))
    if exchanges:
        log.info("Exchanges guardados: %s", ", ".join(e.get("name", "?") for e in exchanges))
    return db


def save_db(path: Path, db: dict[str, Any]) -> None:
    """Guarda el JSON formateado con indentación de 2 espacios."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as fh:
        json.dump(db, fh, ensure_ascii=False, indent=2)
        fh.write("\n")  # Salto de línea final (POSIX)
    log.info("db.json guardado en: %s", path.resolve())


# ---------------------------------------------------------------------------
# Punto de entrada
# ---------------------------------------------------------------------------

def main() -> None:
    log.info("=== Inicio del scraping ===")
    log.info("URL objetivo: %s", URL)
    log.info("Archivo de salida: %s", DB_PATH.resolve())

    try:
        # 1. Descargar la página
        html = fetch_page(URL)

        # 2. Extraer precios principales
        compra, venta = extract_prices(html)

        # 3. Extraer tabla de exchanges (best-effort, no crítico)
        exchanges = extract_exchanges(html)

        # 4. Cargar el historial existente
        db = load_db(DB_PATH)

        # 5. Verificar duplicado antes de escribir
        if is_duplicate(db.get("records", []), compra, venta):
            log.info("No se realizaron cambios en db.json.")
            sys.exit(0)

        # 6. Agregar nuevo registro y guardar
        db = append_record(db, compra, venta, exchanges)
        save_db(DB_PATH, db)

        log.info("=== Scraping completado exitosamente ===")

    except RuntimeError as exc:
        log.error("Error de ejecución: %s", exc)
        sys.exit(1)
    except ValueError as exc:
        log.error("Error de extracción: %s", exc)
        sys.exit(2)
    except Exception as exc:  # noqa: BLE001
        log.exception("Error inesperado: %s", exc)
        sys.exit(3)


if __name__ == "__main__":
    main()
