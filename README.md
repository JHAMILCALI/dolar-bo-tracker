<div align="center">

# 🇧🇴 Dólar Bolivia Hoy

![Bolivia](https://img.shields.io/badge/Bolivia-BO-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0NSAzMCI+PHJlY3Qgd2lkdGg9IjQ1IiBoZWlnaHQ9IjEwIiBmaWxsPSIjRDUyQjFFIi8+PHJlY3QgeT0iMTAiIHdpZHRoPSI0NSIgaGVpZ2h0PSIxMCIgZmlsbD0iI0YwRTY4QyIvPjxyZWN0IHk9IjIwIiB3aWR0aD0iNDUiIGhlaWdodD0iMTAiIGZpbGw9IiMyMzZCMkYiLz48L3N2Zz4=)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-CI%2FCD-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![License](https://img.shields.io/badge/Licencia-MIT-green?style=for-the-badge)

**Seguimiento en tiempo real del precio del dólar paralelo en Bolivia.**  
Datos históricos, comparativa de exchanges y gráficos interactivos, todo open source.

[Ver Demo](#) · [Reportar Bug](../../issues) · [Sugerir Feature](../../issues)

</div>

---

## 📌 ¿De qué trata este proyecto?

El **dólar paralelo** (o dólar blue) en Bolivia es el precio real al que se realizan transacciones diarias fuera del sistema bancario oficial. Este proyecto nace de la necesidad de la comunidad boliviana de tener una fuente **abierta, transparente y accesible** para consultar estos precios, sin depender de apps cerradas o sitios con publicidad excesiva.

Este repositorio recopila automáticamente los precios de compra y venta de múltiples exchanges y los expone en una interfaz web moderna y responsiva.

---

## ✨ Características

| Feature | Descripción |
|---------|-------------|
| 📊 **Precio en tiempo real** | Compra y venta del dólar paralelo actualizado automáticamente |
| 🏦 **Comparativa de Exchanges** | Binance, Bybit, Bitget, SaldoAR, DoradoP2P, Airtm y más |
| 📈 **Gráfico histórico** | Visualización por semana, mes o año con toggle compra/venta |
| 📥 **Exportar a CSV** | Descarga el historial directamente desde el navegador |
| 🔔 **Tendencia visual** | Badge que indica si el precio subió, bajó o se mantuvo |
| 📱 **Responsive** | Funciona en móvil, tablet y escritorio |
| 🌙 **Tema oscuro** | Interfaz dark por defecto, cómoda para el ojo |

---

## 🗂️ Estructura del Proyecto

```
📦 dolar-bolivia-hoy
├── 📁 .github/
│   └── 📁 workflows/
│       └── scrape.yml          # Automatización con GitHub Actions
├── 📁 frontend/                # App React + Vite + TypeScript
│   └── 📁 src/
│       ├── 📁 components/      # PriceCard, PriceChart, ExchangesTable, HistoryTable
│       ├── 📁 hooks/           # useDollarData (fetch + estado)
│       └── 📁 utils/           # formatters (fecha, BOB, tendencia)
├── 📁 public/
│   └── 📁 data/
│       └── db.json             # Base de datos JSON (historial de precios)
└── 📁 scripts/
    ├── scrape.py               # Web scraper con Playwright + BeautifulSoup
    └── requirements.txt        # Dependencias Python
```

---

## 🚀 Cómo correr el proyecto localmente

### Prerrequisitos

- Python **3.10+**
- Node.js **18+**
- npm o pnpm

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/dolar-bolivia-hoy.git
cd dolar-bolivia-hoy
```

### 2. Instalar y ejecutar el scraper

```bash
pip install -r scripts/requirements.txt
playwright install chromium
python scripts/scrape.py
```

Esto actualiza `public/data/db.json` con los precios actuales.

### 3. Levantar el frontend

```bash
cd frontend
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

---

## 🛠️ Stack Tecnológico

### Frontend
- **React 19** + **TypeScript 5** — UI declarativa con tipado estricto
- **Vite 6** — servidor de desarrollo ultrarrápido
- **SVG nativo** — gráficos sin librerías externas

### Scraper
- **Playwright** — navegador headless para páginas con JavaScript
- **BeautifulSoup 4** + **lxml** — parsing HTML en múltiples capas
- **Python 3.12** — sin frameworks, solo stdlib + librerías mínimas

### Infraestructura
- **GitHub Actions** — CI/CD para automatización del scraping
- **JSON estático** — base de datos sin servidor, deployable en cualquier hosting

---

## 🤝 Contribuir a la Comunidad

Este proyecto es **100% open source** y las contribuciones son bienvenidas. Si eres boliviano o te interesa la economía de Bolivia, puedes ayudar de muchas formas:

### 🐛 Reportar un bug
1. Abre un [Issue](../../issues/new) describiendo el problema
2. Incluye el mensaje de error y tu OS/versión de Python
3. Si el scraper falla, adjunta el fragmento del HTML extraído

### 💡 Sugerir mejoras
- ¿Quieres agregar un nuevo exchange?
- ¿Una nueva moneda (Euro, Real)?
- ¿Notificaciones por Telegram o WhatsApp?

Abre un [Issue con etiqueta `enhancement`](../../issues/new?labels=enhancement).

### 🔧 Hacer un Pull Request

```bash
# 1. Fork del repositorio
# 2. Crear una rama descriptiva
git checkout -b feature/agregar-exchange-nuevo

# 3. Hacer los cambios
# 4. Commit con mensaje claro
git commit -m "feat: agregar exchange XYZ a la comparativa"

# 5. Push y abrir PR
git push origin feature/agregar-exchange-nuevo
```

### 📋 Convención de commits

| Prefijo | Uso |
|---------|-----|
| `feat:` | Nueva funcionalidad |
| `fix:` | Corrección de bugs |
| `chore:` | Mantenimiento / datos |
| `docs:` | Documentación |
| `style:` | Cambios de UI/CSS |

---

## 📊 Estructura del `db.json`

```json
{
  "lastUpdated": "2026-03-31T16:00:00+00:00",
  "source": "https://dolarboliviahoy.com/",
  "records": [
    {
      "timestamp": "2026-03-31T16:00:00+00:00",
      "compra": 9.32,
      "venta": 9.28
    }
  ],
  "exchanges": [
    {
      "name": "Binance",
      "compra": 9.32,
      "venta": 9.29,
      "url": "https://p2p.binance.com"
    }
  ]
}
```

---

## 📜 Licencia

Distribuido bajo la licencia **MIT**. Puedes usar, copiar, modificar y distribuir este proyecto libremente.  
Ver [`LICENSE`](LICENSE) para más detalles.

---

<div align="center">

Hecho con ❤️ para la comunidad boliviana  
Si este proyecto te es útil, considera darle una ⭐ en GitHub

</div>
