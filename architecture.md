# Egg Game - Architecture & Technical Documentation

Este documento describe la arquitectura, stack tecnológico, mecánicas principales y flujo de datos de **Egg**, un juego interactivo multijugador tipo *clicker* donde los usuarios contribuyen a una meta global mediante interacciones sincronizadas. 

Está diseñado con un enfoque "Senior", priorizando el rendimiento, la sincronización distribuida y la atomicidad de las transacciones.

---

## 1. Stack Tecnológico

El proyecto está dividido en dos repositorios/directorios principales:

### Frontend
- **Framework:** Next.js (App Router) + React.
- **Estilos y Animaciones:** TailwindCSS, Framer Motion (para transiciones ultra fluidas e indicadores visuales de temperatura/daño).
- **Autenticación:** NextAuth.js configurado con Google OAuth.
- **Comunicación en Tiempo Real:** WebSockets nativos.

### Backend
- **Framework:** FastAPI (Python) asíncrono.
- **Base de Datos:** PostgreSQL.
- **ORM:** SQLAlchemy (Async) con `asyncpg`.
- **Manejo de Estados:** JWT (JSON Web Tokens) firmados con secreto compartido entre NextAuth y FastAPI.

---

## 2. Mecánicas de Juego y Matemáticas Base

### 2.1 Sistema de Clics y Economía
- **Global Goal:** Se requiere alcanzar 1,000,000,000 de clics a nivel global.
- **Recompensa (EggCoins):** Los usuarios son recompensados con dinero del juego. La tasa de conversión matemática es de `10 Clics = 1 EggCoin`. Esta regla aplica incluso con multiplicadores.

### 2.2 Sistema de Sobrecalentamiento (Fatiga Exponencial)
Para evitar el abuso mediante *macros*, el huevo implementa un sistema de sobrecalentamiento dinámico:
- **Umbrales Exponenciales:** A los 100, 200, 400, 800, 1600, 3200, 6400 clics dentro de una misma sesión, se dispara una alarma térmica.
- **Penalizaciones (Cooldown):** Cruzar un umbral bloquea el huevo durante X segundos (5s, 10s, 20s, 40s, 80s, 160s, 300s respectivamente).
- **Panel de Temperatura:** Una UI termodinámica muestra la temperatura del huevo (0°C a 100°C). Cada fase tiene una "temperatura base" mayor.

### 2.3 Reseteo por Inactividad
- Si un usuario deja de hacer clics por un período determinado (calculado dinámicamente según la fase en la que esté), la sesión de clics locales vuelve a cero, permitiendo al usuario volver a dar clics sin penalizaciones pesadas.

---

## 3. Arquitectura de Sincronización y Estado (Capa Crítica)

El juego enfrenta el clásico problema de un *Clicker*: No se puede enviar una petición HTTP al servidor por cada clic manual, ya que causaría cuellos de botella masivos y fallos de base de datos.

### 3.1 Flujo "Batching" Frontend -> Backend
1. **Piscina de Memoria (Frontend):** Se utiliza el hook de React `useBatchClick.ts`. Este hook captura en memoria (vía `useRef`) los clics manuales, clics automáticos y uso de multiplicadores temporales.
2. **Optimistic UI:** El frontend refleja instantáneamente los cambios matemáticos (ej. resta 1 martillo visualmente, suma 5 puntos) para que el jugador perciba 0 latencia.
3. **Flushing Interval (2 Segundos):** Cada 2 segundos, el frontend consolida las acciones locales en un payload JSON y lo envía al backend (`POST /api/v1/clicks/`).

### 3.2 Protección contra Cierre de Pestañas (Safe Disconnect)
- **Problema:** Si el usuario cierra o recarga la pestaña (F5) antes del *flush* de 2 segundos, los puntos e items gastados se desincronizarían.
- **Solución:** 
  - Al iniciar sesión, el frontend cachea silenciosamente el JWT de autenticación.
  - Se intercepta el evento de navegador `beforeunload`.
  - Se despacha la carga útil final usando `fetch()` con la bandera `keepalive: true` y el token JWT en las cabeceras. Esto asegura que la petición HTTP finalice en segundo plano aunque el navegador ya haya matado el hilo principal.

---

## 4. Estructura de la Base de Datos

### Tabla de Usuarios (`users`)
- Datos personales (email, username, country).
- `total_clicks`: Integer.
- `egg_coins`: Integer.
- `inventory`: Columna de tipo `JSONB` que almacena los contadores de items.

### Manejo Atómico del Inventario (Prevención de Race Conditions)
- El endpoint de recepción de clics (`/api/v1/clicks/`) utiliza actualizaciones a nivel de ORM sumando los valores al instante y forzando el mapeo del diccionario de JSONB utilizando `flag_modified` de SQLAlchemy.
- Esto garantiza que peticiones concurrentes de compra en la tienda (`/buy`) y gasto por clics (`/clicks`) no sobreescriban los items del usuario (Zero-data-loss paradigm).

---

## 5. Items y Modificadores (Tienda)

El motor lógico procesa 5 modificadores principales que interactúan directamente con el estado físico del Huevo:
1. **Autoclicker:** Simulación remota que inyecta clics por segundo sin iteración manual del usuario.
2. **Martillo x5:** Modificador estático de fuerza. Multiplica el valor del siguiente "clic manual" x5.
3. **Mano Helada:** Modificador condicional. Se activa automáticamente cuando se alcanza un umbral de sobrecalentamiento, reseteando la penalidad a 0 instantáneamente.
4. **TouchMe:** Buff de hiper-velocidad. Dispara 20 clics/segundo reales siempre y cuando el evento `pointerdown` (dedo presionado) esté activo en el huevo.
5. **HamAss:** Modificador de fuerza suprema. Próximos clics valen x100.

---

## 6. Integración Social (Clanes)
- Los usuarios pueden fundar Clanes (Guilds).
- **Economía Compartida:** Una vez unidos a un clan, el tesoro individual pasa a segundo plano. Todos los `egg_coins` generados por el usuario alimentan las arcas del Clan.
- Las compras en la tienda de un miembro del Clan consumen el balance de la bóveda compartida.

---

## 7. Directrices para Futuros Desarrollos (Handover a IAs)
1. **El Backend es la Única Fuente de la Verdad:** Nunca confíes en los montos de inventario provenientes de la petición POST del frontend. El frontend solo envía *cuánto consumió* (deltas), y el backend es el responsable de verificar los fondos de JSONB en Postgres y aplicar deducciones matemáticas.
2. **Cuidado con `db.refresh()`:** Al editar código en los endpoints de clics, no uses lecturas asíncronas lentas antes de un `commit()` si estás modificando el JSONB de `inventory`, esto causará "ghost items". Aplica operaciones matemáticas puras o bloqueos de fila (`with_for_update()`) si es estrictamente necesario.
3. **Optimistic UI:** Cualquier nueva mecánica (ej. nuevas monedas o efectos visuales) debe programarse en `page.tsx` de forma predictiva y manejarse su resolución silenciosamente. No uses Websockets para sincronizar la billetera privada, usa respuestas del payload HTTP REST.
