// elo.js — Cálculo de ELO para partidas de N jugadores.
//
// Algoritmo: cada jugador juega N-1 "duelos" virtuales contra cada otro.
// El ganador "venció" a todos; los eliminados antes "perdieron" contra los
// que quedaron más tiempo. El delta final de cada jugador es el promedio
// de sus N-1 duelos, escalado por K.
//
// K=32 es estándar. Con pocos datos K alto = rating se mueve rápido (bueno
// para un ranking nuevo). Podés bajarlo a 16 luego si querés más estabilidad.

const K = 32;

/**
 * Calcula los deltas ELO para una partida.
 *
 * @param {Array<{userId: string, elo: number, place: number}>} results
 *   `place` es el orden de eliminación: 1 = último en caer (ganador),
 *    valores más altos = eliminados antes.
 *   Ejemplo para 4 jugadores: ganador place=4, primero en caer place=1.
 *
 * @returns {Array<{userId: string, delta: number, newElo: number}>}
 */
function calculateElo(results) {
  // Normalizamos: place más alto = mejor resultado.
  // El ganador siempre tiene el place más alto.
  const n = results.length;
  const deltas = results.map(() => 0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const pi = results[i];
      const pj = results[j];

      // Probabilidad esperada de que i gane a j según ELO actual.
      const expectedI = 1 / (1 + Math.pow(10, (pj.elo - pi.elo) / 400));
      const expectedJ = 1 - expectedI;

      // Resultado real: 1 si ganó, 0 si perdió (place mayor = ganó).
      const scoreI = pi.place > pj.place ? 1 : 0;
      const scoreJ = 1 - scoreI;

      deltas[i] += K * (scoreI - expectedI);
      deltas[j] += K * (scoreJ - expectedJ);
    }
  }

  // Promediamos contra N-1 oponentes para no inflar el delta en salas grandes.
  return results.map((p, i) => {
    const delta = Math.round(deltas[i] / (n - 1));
    const newElo = Math.max(100, p.elo + delta); // piso en 100
    return { userId: p.userId, delta, newElo };
  });
}

module.exports = { calculateElo };
