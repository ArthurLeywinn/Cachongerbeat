-- Tabla de amistades / solicitudes de amistad.
-- Ejecutar en Supabase (SQL editor). Requiere la tabla users.

create table if not exists friendships (
  id            bigint generated always as identity primary key,
  requester_id  uuid not null references users (id) on delete cascade,
  receiver_id   uuid not null references users (id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at    timestamptz not null default now(),
  unique (requester_id, receiver_id),
  check (requester_id <> receiver_id)
);

create index if not exists idx_friend_requester on friendships (requester_id, status);
create index if not exists idx_friend_receiver  on friendships (receiver_id, status);
