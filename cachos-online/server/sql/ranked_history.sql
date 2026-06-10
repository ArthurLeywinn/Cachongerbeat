-- Tabla de historial ranked por jugador.
-- Ejecutar en Supabase (SQL editor). Requiere las tablas users y ranked_games.

create table if not exists ranked_game_players (
  id          bigint generated always as identity primary key,
  game_id     bigint not null references ranked_games (id) on delete cascade,
  user_id     uuid   not null references users (id) on delete cascade,
  place       int    not null,          -- 1 = ganador
  elo_before  int    not null,
  elo_after   int    not null,
  delta       int    not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_rgp_user    on ranked_game_players (user_id, created_at desc);
create index if not exists idx_rgp_game    on ranked_game_players (game_id);
