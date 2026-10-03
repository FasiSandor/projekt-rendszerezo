# ChatHub – Projekt Rendszerező

Saját, mobil-first projekt- és beszélgetéskatalógus iPhone–iPad–Mac felhőszinkronnal.

## Aktuális állapot
- Neon Postgres + Neon Auth / Better Auth
- többeszközös felhőszinkron
- ChatGPT `conversations.json` inkrementális import
- ChatGPT `project_id` felismerés és automatikus projektkártya-felépítés
- meglévő kézi projekt/téma/archív besorolás megőrzése újraimportnál
- globális foszlánykeresés, okos beérkező, klaszterezés és duplikációfigyelés
- helyi biztonsági mentés + Neon felhő

## Import
A ChatGPT adatexport ZIP-jét ki kell bontani. A ChatHubban jelöld ki a `conversations.json` fájlt; ha az export külön projektlistát is tartalmaz (például `projects.json`), azt ugyanabban a fájlválasztásban hozzáadhatod. A kliens a projektazonosítókat a chatekhez köti, és csak a rendezett katalógust menti a Neonba.
