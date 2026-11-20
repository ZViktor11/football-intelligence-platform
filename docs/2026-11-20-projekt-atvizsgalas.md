# Projektátvizsgálás – 2026. november 20.

Vizsgált GitHub-verzió: `architecture-rebuild`, `e8de924`. A vizsgálat statikus kódellenőrzésre, függőségvizsgálatra és a meglévő automatikus tesztekre terjedt ki. Nem teljes körű penetrációs teszt.

## Ellenőrzött eredmények

| Ellenőrzés | Eredmény |
| --- | --- |
| Backend unit teszt | 20/20 tesztcsomag, 155/155 teszt |
| Jest sorlefedettség | 59,65% |
| Jest elágazáslefedettség | 57,94% |
| Backend build | Sikeres |
| Web build és ESLint | Sikeres |
| Mobil TypeScript | Sikeres |
| Korábbi Android csomagexport | Sikeres a vizsgált funkciók bevezetésekor |

A teljes mobilos lint korábban 4 hibát és 5 figyelmeztetést jelzett. A meglévő e2e teszt csak a gyökérvégpontot ellenőrzi; a jelen felülvizsgálat során nem futott teljes adatbázisos integrációs teszt.

## Prioritásos megállapítások

| Prioritás | Megállapítás | Javasolt intézkedés |
| --- | --- | --- |
| P0 | `GET /users` és `GET /users/:id` nyilvános, e-mail-címeket és egyéb fiókadatokat is visszaad. | Hitelesítés és megfelelő szerepkör, adatminimalizálás. |
| P0 | A szezon-, csapat-, játékos- és stábtag-létrehozásnál a COMPETITION_ADMIN szerepkör ellenőrzése nincs a célbajnokságra korlátozva. | A célobjektum bajnokságának feloldása, hatókör-ellenőrzés és regressziós tesztek. |
| P0 | A bejelentkezés és a JWT guard nem ellenőrzi a felhasználó `isActive` állapotát. | Az inaktív vagy törölt fiókok azonnali kizárása a védett végpontokról. |
| P1 | Mérkőzésesemények validálása a tranzakción kívül történik; párhuzamos eseményrögzítéskor ütközés lehetséges. | Mérkőzésenkénti atomikus szerializált művelet és párhuzamos integrációs teszt. |
| P1 | Korábbi csere törlése vagy módosítása után nem történik a teljes eseménytörténet újraellenőrzése. | A teljes időrendi játékosállapot visszajátszása, inkonzisztens módosítás elutasítása. |
| P1 | A második sárga lap nem vált automatikusan kiállítássá; ehhez jelenleg külön piros lapot kell rögzíteni. | Egységes üzleti szabály meghatározása az alkalmazás célbajnokságaihoz. |
| P1 | Az API a hiányzó JWT titkot nem jelzi egyértelműen induláskor, a belépés hibát adhat. Nincs külön belépési kísérletszám-korlát. | Környezeti konfiguráció ellenőrzése induláskor, belépési rate limit. |
| P1 | A mérkőzéslista szűrői nincsenek megfelelő DTO-val validálva; a hibás azonosító vagy státusz adatbázishibát okozhat. | Érvényes pozitív azonosítók és enum értékek ellenőrzése. |
| P2 | Weben az API címe több helyen localhost-ra van rögzítve; a Docker fejlesztői adatbázis alapértelmezett jelszót és nyitott host portot használ. | Konfigurálható API URL, dokumentált fejlesztői és éles környezet szétválasztása. |
| P2 | Nincs teljes CI tesztfolyamat és reprodukálható, dokumentált demóadat-telepítés a repóban. | GitHub Actions, példakörnyezeti beállítások és demó seed. |

A párhuzamossági és eseménytörténeti megállapítások kódból következő kockázatok, reprodukáló integrációs teszt még szükséges.

## Függőségek

A 2026. november 20-i `npm audit --omit=dev` alapján:

| Alkalmazás | Kritikus | Magas | Közepes | Összes |
| --- | ---: | ---: | ---: | ---: |
| API | 1 | 11 | 5 | 17 |
| Web | 0 | 0 | 0 | 0 |
| Mobil | 0 | 6 | 8 | 14 |

Az értékek érintett függőségcsomagokra vonatkoznak, nem egyedi alkalmazáshibák számára. Kritikusnak jelölt backend csomag: proxy-addr, amelynek konkrét alkalmazáson belüli kihasználhatósága nincs igazolva. A mobilon az Expo eszközlánc mellett az Expo Router query-string/decode-uri-component függőségi lánca is érintett; az automatikus javaslat főverzióváltással járna. Az Expo SDK és a Prisma kompatibilitásának megőrzése érdekében célzott frissítés és újratesztelés szükséges, nem automatikus `npm audit fix --force`.

## Javasolt sorrend

1. Jogosultsági és fiókbiztonsági javítások regressziós tesztekkel.
2. Backend függőségek biztonságos frissítése; mobilos függőségek SDK-kompatibilis kezelése.
3. Időrendi eseményvalidáció és párhuzamos írások integritása.
4. Valós HTTP/adatbázisos integrációs tesztek, különösen a jogosultságokra, kedvencek izolálására, státuszokra és eseményjavításokra.
5. Reprodukálható telepítési útmutató, demóadatok és szakdolgozati dokumentáció véglegesítése.

Az áttekintés csak dokumentálja a hibákat és kockázatokat; nem tartalmazza a felsorolt javításokat.

## Utókövetés – jogosultsági javítások

A három P0 megállapítás javítása elkészült a `559bf23` verzió alapján.

- A felhasználói listát és egyedi fiókadatokat csak aktív, hitelesített rendszeradminisztrátor érheti el.
- A szezon, csapat, játékos és stábtag létrehozása ellenőrzi a célbajnokságot. A szezon és csapat alapján a szerver az adatbázisból oldja fel a bajnokságot. A bajnokságadminisztrátor csak a hozzá rendelt bajnokságban hozhat létre adatot; csapat nélküli játékost csak rendszeradminisztrátor hozhat létre.
- Az inaktív fiókok belépési kísérlete sikertelen, és a korábban kiadott token sem jogosít védett végpont elérésére. A törölt fiókok tokenjei szintén elutasításra kerülnek.
- A nyilvános sportadatok lekérdezési végpontjai továbbra is elérhetők hitelesítés nélkül.

Ellenőrzés: 23 sikeres tesztcsomag, 199/199 teszt (44 új). Ebből hét HTTP-integrációs teszt a tényleges NestJS guardokat és vezérlőket használja, mockolt adatbázissal és tokenellenőrzéssel. A tesztek ellenőrzik a 401, 403, 200 és 201 válaszokat. A backend build sikeres. Nincs új adatbázis-migráció vagy kliensoldali függőség. A többi korábban feltárt kockázat továbbra is nyitott.
