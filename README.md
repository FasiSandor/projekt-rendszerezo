# ChatHub – Projekt Rendszerező

Saját, mobil-first projekt- és beszélgetéskatalógus iPhone–iPad–Mac felhőszinkronnal.

## Aktuális állapot
- Neon Postgres + Neon Auth / Better Auth
- többeszközös felhőszinkron
- teljes ChatGPT export ZIP közvetlen, kliensoldali import
- ChatGPT `project_id` felismerés és automatikus projektkártya-felépítés
- meglévő kézi projekt/téma/archív besorolás megőrzése újraimportnál
- globális foszlánykeresés, okos beérkező, klaszterezés és duplikációfigyelés
- helyi biztonsági mentés + Neon felhő

## Import
A ChatHubban közvetlenül kiválasztható a ChatGPT teljes adatexport ZIP-je. A böngésző helyben bontja ki, automatikusan megkeresi a conversations/project JSON fájlokat, összeköti a projektazonosítókat a chatekkel, és csak a rendezett katalógust menti a Neonba. A JSON-fájlok kézi importja továbbra is támogatott.
