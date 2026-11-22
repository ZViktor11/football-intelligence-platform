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

## Utókövetés – függőségek frissítése

A `4aa1227` verzió alapján a támogatott főverziókon belül frissültek a függőségek és a lockfájlok, `npm audit fix --force` nélkül. A Prisma CLI, Client és PostgreSQL adapter egységesen 7.10.1 verzióra került. A Prisma konfiguráció Effect-függőségéhez célzott, azonos főverziójú 3.22.5 override tartozik. A mobil Expo SDK 57 maradt (Expo 57.0.33), az SDK-kompatibilis csomagokat az Expo telepítő ellenőrizte.

| Alkalmazás | Korábbi production audit | Új production audit | Új teljes audit |
| --- | ---: | ---: | ---: |
| API | 17 | 0 | 3 közepes |
| Web | 0 | 0 | 0 |
| Mobil | 14 | 6 | 6 (3 közepes, 3 magas) |

Az API fennmaradó auditbejegyzései a fejlesztői NestJS CLI, glob és minimatch láncot érintik. A mobil fennmaradó bejegyzései az Expo fingerprint/minimatch és az Expo Router/query-string/decode-uri-component lánchoz tartoznak. Az automatikusan javasolt inkompatibilis főverzióváltásokat nem alkalmaztuk; az Expo SDK következő verziójára való átállást külön kell megtervezni és tesztelni. Az audit eredménye nem bizonyítja az alkalmazás teljes biztonságát.

Ellenőrzés: 199/199 backend teszt, 23/23 tesztcsomag, backend build, Prisma Client generálás és sémavalidáció, web build és ESLint, mobil TypeScript, Expo függőségellenőrzés és Android export sikeres. Nincs új adatbázis-migráció. A tényleges PostgreSQL-adatbázissal és fizikai mobilkészülékkel történő regressziós ellenőrzés külön szükséges.

A mobil lint változatlanul 4 korábban ismert hibát és 5 figyelmeztetést jelez; ezek külön kódminőségi feladatot képeznek. A lint ideiglenesen létrehozott konfigurációja és csomagjai nem részei ennek a frissítésnek.

## Utókövetés – integritás, konfiguráció és automatizált ellenőrzés

A `e234cb5` verzióra épülő fejlesztések lezárják a korábbi P1 alkalmazáslogikai feladatokat:

- A második sárga lap automatikusan kiállításnak számít. Az események tárolási típusa változatlan, a második sárga megjelölése származtatott (`isSecondYellow`), ezért nincs külön piros esemény duplikációja. A játékos statisztikáiban mérkőzésenként egy kiállítás számít. A web és a mobil a kiválasztott percig ismét lejátssza az eseményeket.
- Az események létrehozása, módosítása és törlése szerializálható Prisma tranzakcióban történik, a teljes időbeli eseménytörténet ellenőrzésével, eredményszámítással és auditnaplóval. Azonos percben az eseményazonosító dönt a sorrendről. Ütközés esetén korlátozott újrapróbálkozás történik, ismételt tranzakciós konfliktusnál HTTP 409 válasz érkezik.
- Hibás korábbi csere vagy lap javítása nem hagyhat hátra érvénytelen eseményt. Ha a régi adatokban a második sárga után külön piros lapot is felvettek, vagy egyéb konzisztenciahiba van, a fölösleges vagy függő eseményeket kell először javítani. A meglévő adatokat nem módosítja automatikus migráció.
- A bejelentkezés és regisztráció egy API-példányon IP-címenként összesen 10 kérés/perc korlátot kapott. A JWT titok és az adatbáziscím hiánya induláskor egyértelmű hibát ad. A mérkőzésszűrők DTO-validációja kiszűri a hibás azonosítókat és státuszokat.
- A web API-címe és az API CORS-beállítása konfigurálható. A helyi Docker PostgreSQL portja csak a loopback címre van kötve. A mintakörnyezeti fájlok és a README elválasztják a helyi és éles telepítést.
- A demóadat-szkript négy csapatot, 56 játékost, négy mérkőzést és kereteket hoz létre, ismételhető, a meglévő demóadmin jelszavát nem írja felül.
- A mobilon javult az automatikus és kézzel megadott mérkőzésperc kezelésének állapota; a lint 0 hibát és 0 figyelmeztetést jelez. A lint konfigurációja és fejlesztői függőségei bekerültek a repositoryba.
- GitHub Actions ellenőrzés készült PostgreSQL 16 szolgáltatással, API tesztekkel, web build/lint és mobil típusellenőrzés/lint/Android export lépésekkel.

Helyi ellenőrzés: 219/219 unit és mockolt HTTP-teszt (26 tesztcsomag), valamint 3/3 adatbázisos HTTP-teszt (2 tesztcsomag) PostgreSQL-kompatibilis PGlite adatbázison, valós Prisma és NestJS használatával. A teszt igazolja a két párhuzamos csere közül az egyik elutasítását, a hibás eseménytörlés visszagörgetését, a második sárgás kiállítást és kedvencek elkülönítését. A demószkript kétszeri futtatása azonos mérkőzésazonosítókat adott. A backend build, web build és lint, mobil TypeScript, lint, Expo-kompatibilitás és Android export sikeres. Az új mobil lint függőségekkel a teljes és production audit változatlanul 6 bejegyzést mutat. A natív PostgreSQL 16 CI futása az első push után ellenőrizhető; fizikai telefonos regresszió továbbra is szükséges.

Nyitott üzemeltetési feladatok: a fennmaradt Expo SDK- és fejlesztői függőségi auditbejegyzések kezelése kompatibilis verziókkal, a GitHub Actions tényleges futásának ellenőrzése, éles környezetben erős adatbázis-hitelesítés, HTTPS és több API-példány esetén megosztott rate limit. Ez a változtatás nem állítja, hogy teljes körű biztonsági audit vagy éles telepítés történt.

## 2026. november 22. – záró stabilizálás

Kiinduló verzió: `874cc9d`. A fejlesztő a saját gépén sikeres funkcionális tesztelést és zöld GitHub Actions futást jelentett. A végső áttekintés négy fennmaradó hibájának javítása:

- A produkciós indítóparancs a tényleges buildkimenetre (`dist/src/main.js`) mutat.
- A második félidőből nem lehet ismét félidőre váltani; a hibás állapotátmenet 400-as választ ad.
- A kezdőcsapat létszáma csapatonként legfeljebb 11; a cserék száma ettől független. A szerver új kezdő kiválasztásakor és egy cserejátékos kezdővé módosításakor is ellenőrzi a korlátot. A párhuzamos keretmódosításokat szerializálható tranzakció védi. A rendszer a 11-nél kisebb kereteket továbbra is engedi.
- A fair play rangsorolás a lezárt mérkőzések lapjaiból számol, játékosonként és stábtagonként: egy sárga 1, második sárgás kiállítás összesen 3, közvetlen piros 4, sárga és közvetlen piros együtt 5 büntetőpont. Ez a platform választott szabálya, nem minden bajnokságra érvényes hivatalos előírás. A kevesebb pont előnyt jelent.
- Teljes egyezés esetén a sorsolási szabály szezononként egyszer véletlenszerűen generált, adatbázisban tárolt UUID és a csapatazonosító SHA-256 hash-e alapján ad stabil sorrendet. A csapatnév vagy a lekérdezések sorrendje nem befolyásolja az eredményt. Ez automatikus digitális sorsolásmodell, nem hivatalos szövetségi sorsolás. A még mérkőzés nélküli csapatok megjelenítése változatlanul névsorrendben történik.
- Lezárt mérkőzés eseményjavításakor a szerepkör-lekérdezés is az esemény tranzakciójában történik, külön adatbázis-kapcsolat igénybevétele nélkül.

Adatbázis: `20261122160000_add_standings_draw_seed` migráció; a meglévő szezonok automatikusan megkapják a véletlen magot, a korábbi sportadatok nem törlődnek. Telepítés: `npx prisma migrate deploy`, `npx prisma generate`.

Ellenőrzés: 231/231 unit és mockolt HTTP-teszt (28 tesztcsomag), 5/5 adatbázisos HTTP-teszt (2 tesztcsomag) PostgreSQL-kompatibilis PGlite adatbázison, sikeres backend build és produkciós indítás (HTTP 200). A tesztekben a 12. kezdő elutasítása, a párhuzamos kezdőválasztás, az ismételt félidő elutasítása, a fair play sorrend és a stabil sorsolás is szerepel. A natív PostgreSQL 16 ellenőrzést a CI végzi az új commit feltöltése után. A webes és mobilos forráskód, valamint a függőségek ebben a javításban változatlanok.

Továbbfejlesztési lehetőség: automatikus tokenfrissítés, mérkőzésjelentések külön felülete, bajnokságonként konfigurálható fair play szabály, külső hivatalos sorsolási eredmény rögzítése és Expo főverziófrissítés.
