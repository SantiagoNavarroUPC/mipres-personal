# 🏥 Proyecto MIPRES

Sistema de integración y gestión de prescripciones **MIPRES**, construido bajo arquitectura **Modelo – Vista – Controlador (MVC)**, optimizado para alto volumen de consultas, con manejo de cache, control de tiempos de respuesta y generación de formato de impresión en PDF.
---
# 🔬 SECCIÓN TÉCNICA

## 📌 Contexto Técnico

El sistema se integra con la API oficial de MIPRES para:

- Generación y validación de token
- Consulta de prescripciones y tutelas por:
  - Fecha
  - Paciente
  - Número de prescripción
- Consulta de novedades, direccionamiento y no direccionamiento

Se implementa un **modelo híbrido de procesamiento por chunks**, permitiendo manejar grandes volúmenes de información sin sobrecargar:

- La API externa
- El servidor backend
- La memoria del proceso

---

## 🧠 Estrategia de Optimización

### 1️⃣ Procesamiento por Chunks en las consultas de la API de MIPRES

Cuando se consultan rangos de fechas amplios:

- Se divide el rango en intervalos menores
- Se ejecutan consultas en paralelo controlado
- Se consolidan los resultados
- Se normalizan los datos

Esto evita:

- Timeouts
- Saturación de memoria
- Bloqueos en la API externa

---

### 2️⃣ Sistema de Cache

Ubicado en `/lib`

Permite:

- Evitar llamadas repetidas
- Reducir latencia
- Mejorar experiencia de usuario
- Controlar expiración por TTL (Time To Live)

### 4️⃣ Hooks

Se utilizan para:

- Interceptar requests
- Interceptar responses
- Normalizar datos
- Manejo centralizado de errores
- Aplicar transformaciones antes de enviar la respuesta final

# 📌 Descripción General

El proyecto permite:

- 🔐 Generación y validación de token MIPRES
- 📅 Consulta de prescripciones y tutelas por:
  - Fecha
  - Paciente
  - Número de prescripción
  - Novedades
  - Rango de fechas
- ⚡ Optimización mediante cache
- 📄 Generación de formato de impresión (PDF)
- 🧠 Direccionamiento y No direccionamiento

---

# 🏗 Arquitectura

Modelo – Vista – Controlador (MVC)

Separación clara de responsabilidades por capas.

---

## 🔄 Flujo General

Models → Request → Controller → App (routes.ts) → Components
↓
Lib (cache, hooks, performance)


---

# 📂 Estructura del Proyecto

src/
│
├── models/
│ ├── prescripcion.model.ts
│ ├── token.model.ts
│
├── controllers/
│ ├── prescripcion.controller.ts
│
├── app/
│ ├── routes.ts
│ ├── server.ts
│
├── lib/
│ ├── cache.ts
│ ├── hooks.ts
│ ├── performance.ts
│
├── components/
│ ├── PrescripcionView.ts
│
├── docs/
│ ├── PRESCRIPCION_PDF_README.md
│
└── ...

---

# 🔁 Flujo por Capas

## 1️⃣ Models

- Interfaces
- Validaciones
- Estructuras de datos
- Preparación de payloads

---

## 2️⃣ Request Layer

- Construcción de peticiones HTTP
- Inclusión de token
- Manejo de headers
- Captura de errores de red
- Normalización de respuestas

---

## 3️⃣ Controllers

- Recepción de parámetros
- Validación de rangos
- Procesamiento por chunks
- Aplicación de cache
- Respuesta estructurada

Ejemplo conceptual:

```ts
prescripcionController.getByFecha()

📄 Formato de Impresión

Documentado en:

PRESCRIPCION_PDF_README.md

📊 Flujo Visual de MIPRESS

Documentado en Excalidraw:

https://excalidraw.com/#json=3vwsMpcG750KgFj3dIfvi,Ls-Wp3V7NjXAYJg9PwjWVg
