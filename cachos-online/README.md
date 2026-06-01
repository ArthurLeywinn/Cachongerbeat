# 🎲 Cachos Online — Liar's Dice multijugador en tiempo real

Juego web multijugador en tiempo real de **Cachos / Dudo** (Liar's Dice), basado en las
reglas del instructivo de *Dactic Games*. Bluffea, sube la apuesta, **duda** o **calza**
para quedarte con el último dado en pie.

- **Frontend:** React + Vite + TailwindCSS
- **Backend:** Node.js + Express + Socket.io
- **Tiempo real:** WebSockets (estado personalizado por jugador, dados ocultos hasta la revelación)
- **Monorepo:** npm workspaces (`client` + `server`)

---

## ✨ Características

- Creación de salas con **código único** de 4 caracteres.
- Unión por código + **lobby** con lista de jugadores.
- Turnos, tirada de dados, **dados ocultos** para el resto y **revelados** en la resolución.
- Apuestas válidas según las reglas (subir cantidad/pinta, bajar a ases, salir de ases).
- **Comodín:** el As (1) cuenta como cualquier pinta (salvo cuando se apuesta a ases).
- Acciones de **Dudar** y **Calzar** con su resolución completa.
- **Descarte central** de dados: los dados perdidos van al centro y se recuperan al calzar.
- **Eliminación** de jugadores sin dados y **victoria** del último en pie.
- Ronda especial del **"último dado"** (el jugador con 1 dado lo ve; el resto apuesta a ciegas).
- **Reconexión básica** (la sesión se guarda en `sessionStorage`).
- UI moderna, responsiva y temática (mesa de fieltro, dados con pips renderizados).

---

## 📁 Estructura del proyecto

```
cachos-online/
├── package.json            # raíz · workspaces + scripts (dev, build, start)
├── README.md
├── .gitignore
├── .nvmrc
├── server/                 # backend (Express + Socket.io)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js        # servidor HTTP + Socket.io (eventos)
│       ├── gameManager.js  # administra salas en memoria
│       ├── game.js         # clase Game: estado y transiciones
│       └── rules.js        # motor de reglas PURO (apuestas, comodín, dudar, calzar)
└── client/                 # frontend (React + Vite + Tailwind)
    ├── package.json
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── .env.example
    ├── public/
    │   └── dice.svg
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── socket.js                 # cliente Socket.io
        ├── lib/
        │   └── rules.js              # espejo de reglas para feedback de UI
        ├── context/
        │   └── GameContext.jsx       # estado global + listeners + reconexión
        └── components/
            ├── Home.jsx              # crear / unirse
            ├── Lobby.jsx             # sala de espera
            ├── GameTable.jsx         # mesa de juego
            ├── PlayerSeat.jsx        # asiento de jugador + dados
            ├── BidPanel.jsx          # apostar / dudar / calzar
            ├── ActionLog.jsx         # historial
            ├── RoundResult.jsx       # resultado de ronda
            ├── Die.jsx               # dado individual (SVG)
            └── Toast.jsx             # notificaciones
```

---

## 🚀 Ejecutar localmente

Requisitos: **Node.js 18+** y **npm 9+** (incluye workspaces).

```bash
# 1) Clonar
git clone <tu-repo> cachos-online
cd cachos-online

# 2) Instalar TODAS las dependencias (cliente + servidor) de una vez
npm install

# 3) Levantar cliente y servidor en paralelo
npm run dev
```

Luego abre:

- **Cliente:** http://localhost:5173
- **Servidor (health):** http://localhost:3001/health

Para probar el multijugador, abre varias pestañas/dispositivos, crea una sala en una y
únete con el código desde las demás.

### Scripts disponibles (raíz)

| Comando | Descripción |
|---|---|
| `npm run dev` | Cliente (Vite) + servidor (nodemon) en paralelo. |
| `npm run dev:server` | Solo el servidor. |
| `npm run dev:client` | Solo el cliente. |
| `npm run build` | Compila el cliente a `client/dist`. |
| `npm run start` | Inicia el servidor en modo producción (sirve `client/dist` si existe). |

### Variables de entorno (opcionales)

- `client/.env` → `VITE_SERVER_URL` (URL del servidor, por defecto `http://localhost:3001`).
- `server/.env` → `PORT` y `CLIENT_ORIGIN` (CORS).

Copia los `.env.example` a `.env` si necesitas personalizarlos.

---

## 🎮 Cómo se juega (resumen de reglas)

1. Cada jugador parte con **5 dados** que tira en secreto.
2. Por turnos se apuesta una **cantidad** de una **pinta** (cara) que se cree habrá
   **sumando todos los dados de la mesa**.
3. En tu turno puedes:
   - **Subir la apuesta** (más cantidad, o misma cantidad con pinta mayor).
   - **Bajar a ases** (la cantidad mínima es la mitad redondeada hacia arriba).
   - **Salir de ases** hacia otra pinta (mínimo el doble más uno).
   - **Dudar** de la apuesta anterior.
   - **Calzar** (solo con la mitad de los dados en juego o teniendo 1 dado).
4. **Comodín:** el **As (1)** cuenta como la pinta apostada (excepto cuando se apuesta a ases).
5. **Dudar:** se revelan los dados.
   - Si hay **menos** que lo apostado → pierde el **apostador**.
   - Si hay **igual o más** → pierde el que **dudó**.
6. **Calzar:** se revelan los dados.
   - Si la cantidad **coincide exacta** → el que calzó **gana** un dado (desde el centro).
   - Si **no** coincide → el que calzó **pierde** un dado.
7. Los dados perdidos van al **centro**; los recuperados salen de ahí (máximo 5 por jugador).
8. Quien se queda **sin dados** es eliminado. **Gana** el último con dados.

### Nota sobre la interpretación de reglas

El instructivo del PDF describe los mecanismos especiales (comodín, conversión a/desde
ases, dudar, calzar y la ronda del último dado), que se implementan tal cual. Para el
**orden general entre pintas normales** se usa la convención estándar del Dudo chileno
(*sube la cantidad, o mantén la cantidad y sube la pinta*), que es consistente y evita
ambigüedades. La autoridad de validación siempre es el **servidor** (`server/src/rules.js`).

---

## 🔌 Eventos de Socket.io

**Cliente → Servidor** (con callback de confirmación `ack`):

| Evento | Payload | Descripción |
|---|---|---|
| `room:create` | `{ name }` | Crea una sala y devuelve `code`, `playerId`, `state`. |
| `room:join` | `{ code, name }` | Une al jugador a la sala. |
| `room:reconnect` | `{ code, playerId }` | Reconexión a una sala existente. |
| `game:start` | `{}` | Inicia la partida (solo anfitrión). |
| `game:bid` | `{ quantity, face }` | Realiza/sube una apuesta. |
| `game:doubt` | `{}` | Duda de la apuesta vigente. |
| `game:calzar` | `{}` | Calza la apuesta vigente. |

**Servidor → Cliente:**

| Evento | Payload | Descripción |
|---|---|---|
| `state` | estado serializado | Estado personalizado (oculta los dados ajenos). |

---

## 🛠️ Stack y decisiones

- **Estado autoritativo en el servidor**: el cliente solo refleja lo que envía el backend;
  los dados ajenos nunca se transmiten hasta la fase de revelación.
- **Reglas puras y testeables** en `rules.js` (mismo archivo espejado en el cliente para UI).
- **npm workspaces** para instalar todo con un solo `npm install`.

---

## 📦 Despliegue (esbozo)

1. `npm run build` genera `client/dist`.
2. El servidor (`npm run start`) sirve esos estáticos y maneja los WebSockets.
3. Configura `CLIENT_ORIGIN` en el servidor y `VITE_SERVER_URL` en el build del cliente.

---

## 📄 Licencia

MIT. Reglas basadas en el instructivo de *Cachos* de Dactic Games (uso educativo / personal).
