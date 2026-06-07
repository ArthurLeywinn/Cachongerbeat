import React from 'react';
import Die from './Die.jsx';

// Pantalla de Reglas: explicación completa + ejemplo de partida.
export default function Rules({ onBack }) {
  return (
    <div className="themed-bg themed-bg--scroll">
      <div className="themed-card rules-card">
        <div className="rules-head">
          <h2 className="font-display text-3xl font-black text-amber-glow">Reglas de Cachos</h2>
          <button onClick={onBack} className="rules-back">← Volver</button>
        </div>

        <div className="rules-body">
          <section>
            <h3>Objetivo</h3>
            <p>
              Cada jugador parte con varios dados (5 por defecto) ocultos bajo su cacho. Por turnos
              se apuesta cuántos dados de cierta pinta hay <strong>sumando los de toda la mesa</strong>.
              Pierdes dados al equivocarte; el último jugador con dados gana.
            </p>
          </section>

          <section>
            <h3>Las pintas</h3>
            <div className="pinta-grid">
              {[
                [1, 'As', 'comodín'],
                [2, 'Tonto', ''],
                [3, 'Tren', ''],
                [4, 'Cuarta', ''],
                [5, 'Quina', ''],
                [6, 'Sexta', ''],
              ].map(([v, name, extra]) => (
                <div key={v} className="pinta-item">
                  <Die value={v} size={34} />
                  <span>
                    {name}
                    {extra && <em> ({extra})</em>}
                  </span>
                </div>
              ))}
            </div>
            <p>
              El <strong>As</strong> es <strong>comodín</strong>: cuenta como la pinta apostada
              (salvo cuando la apuesta es justamente de ases).
            </p>
          </section>

          <section>
            <h3>En tu turno</h3>
            <ul>
              <li>
                <strong>Apostar / subir:</strong> di una cantidad y una pinta. La siguiente apuesta
                debe superar a la anterior: más cantidad, o la misma cantidad con una pinta mayor.
              </li>
              <li>
                <strong>Bajar a ases:</strong> puedes cambiar a ases con la mitad (redondeada hacia
                arriba) de la cantidad previa. Ej.: de “4 trenes” a “2 ases”.
              </li>
              <li>
                <strong>Salir de ases:</strong> para volver a una pinta normal, apuesta al menos el
                doble más uno. Ej.: de “2 ases” a “5 trenes”.
              </li>
              <li>
                <strong>Dudar:</strong> no le crees al anterior. Se revelan todos los dados y se
                cuenta la pinta. Si hay menos de lo apostado, pierde un dado quien apostó; si hay
                igual o más, pierde quien dudó.
              </li>
              <li>
                <strong>Calzar:</strong> afirmas que la cantidad es exacta. Si aciertas, ganas un
                dado; si fallas, lo pierdes. (Disponible con al menos la mitad de los dados en juego,
                salvo que la sala tenga “Calzo infinito”.)
              </li>
            </ul>
          </section>

          <section>
            <h3>Pasar (si está activado)</h3>
            <p>
              En tu turno (después de la primera apuesta) puedes <strong>Pasar</strong>: declaras
              tener una mano especial de 5 dados (todos distintos, todos iguales, o full 3+2) para
              saltarte el turno sin tocar la apuesta. Es un <strong>farol</strong>: el siguiente
              puede creerte y seguir, o <strong>dudar el paso</strong>. Si dudan y de verdad tienes
              esa mano, pierde quien dudó; si faroleabas, pierdes tú un dado.
            </p>
          </section>

          <section>
            <h3>Obliga (al quedar con 1 dado)</h3>
            <p>Una vez por partida, al quedar con un solo dado, eliges una modalidad para esa ronda:</p>
            <ul>
              <li><strong>Kamikaze:</strong> declaras una pinta; tras tirar, todos (tú incluido) pierden los dados que muestren esa pinta.</li>
              <li><strong>Abierto:</strong> ves los dados de los demás pero no el tuyo.</li>
              <li><strong>Cerrado “de esta”:</strong> solo tú ves tu dado; abres “1 de esta” y los demás solo suben cantidad o dudan.</li>
              <li><strong>Cerrado normal:</strong> tú ves tu dado; los demás juegan a ciegas.</li>
            </ul>
          </section>

          <section>
            <h3>Fin de la partida</h3>
            <p>Cuando un jugador se queda sin dados, queda eliminado. Gana el último en pie.</p>
          </section>

          <section className="rules-example">
            <h3>Ejemplo de una ronda</h3>
            <ol>
              <li>Ana, Beto y Caro tienen 5 dados cada uno (15 en total).</li>
              <li>Ana abre: <strong>“3 trenes”</strong> (cree que hay al menos tres 3 en la mesa, contando ases como comodín).</li>
              <li>Beto sube: <strong>“4 trenes”</strong>.</li>
              <li>Caro no le cree y <strong>duda</strong>. Se revelan los dados: hay dos 3 y un as → <strong>3 trenes</strong> en total.</li>
              <li>Como hay 3 y la apuesta era 4 (menos de lo apostado), <strong>Beto pierde un dado</strong>.</li>
              <li>Comienza la siguiente ronda; todos vuelven a tirar.</li>
            </ol>
          </section>
        </div>

        <button onClick={onBack} className="rules-back-bottom">← Volver al menú</button>
      </div>
    </div>
  );
}
