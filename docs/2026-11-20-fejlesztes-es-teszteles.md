# 2026. november 20. – Nézői fiókok és mérkőzésstatisztika

Kiinduló verzió: `architecture-rebuild`, `be1cb88`.

## Új funkciók

- A meglévő regisztrációs API-hoz webes és mobilos regisztrációs felület készült. Az új nézői fiókok nem kapnak adminisztrátori szerepkört. A bejelentkezési válasz tartalmazza a felhasználó szerepköreit, hogy a felület elkülöníthesse a nézői és adminisztrátori funkciókat.
- Adatbázisban tárolt, felhasználónként elkülönített kedvencek: csapat, játékos, bajnokság és mérkőzés. Egy kedvenc ismételt hozzáadása nem hoz létre duplikátumot. A kapcsolatok törlésekor az érintett kedvenc rekordok automatikusan törlődnek.
- Kaput eltaláló lövések: külön kapcsolható mérkőzésstatisztika, kézi csapatonkénti növelés/csökkentés. Negatív érték nem engedélyezett. A gólok rögzítése nem növeli automatikusan ezt a kézzel vezetett számlálót.
- Egyszerűsített labdabirtoklás: a mérkőzésadminisztrátor kiválasztja a birtokló csapatot, vagy szünetelteti a mérést. A szerver a kiválasztás időpontját és a felhalmozott időt tárolja; a százalékos arány a ténylegesen mért időből számolódik. A félidő és a le nem fedett időszakok nem számítanak bele. A félidő után újra ki kell választani a birtokló csapatot. A mérés nem automatikus játékoskövetés és nem teljes körű sportanalitika.
- A két statisztika külön-külön bekapcsolható a mérkőzés kezdése előtt, az illetékes adminisztrátor módosíthatja. Párhuzamos módosítások ütközésekor a szerver 409-et jelez, megakadályozva az adatok felülírását.
- A webes és mobilos mérkőzésrészletező felületen megjelennek az engedélyezett statisztikák.

## Adatbázis és végpontok

Prisma migráció: `20261120120000_add_favorites_and_match_statistics`. A meglévő mérkőzések új statisztikái alapértelmezetten kikapcsoltak; a korábbi adatok megmaradnak.

| HTTP végpont | Funkció |
| --- | --- |
| GET /favorites | Bejelentkezett felhasználó kedvencei |
| PUT /favorites/:type/:id | Kedvenc hozzáadása (team, player, competition, match) |
| DELETE /favorites/:type/:id | Saját kedvenc eltávolítása |
| PATCH /matches/:id/statistics/settings | Két statisztika engedélyezése |
| PATCH /matches/:id/statistics/shots | Csapat és +1/-1 módosítás |
| PATCH /matches/:id/statistics/possession | HOME, AWAY vagy null (szünet) |
| GET /matches/:id | Mérkőzés és számított statisztika |

## Automatikus ellenőrzés

- Backend: 20 tesztcsomag, 146 sikeres teszt, ebből 23 új.
- Backend build: sikeres.
- Web build és ESLint: sikeres.
- Mobil TypeScript: sikeres. Az új mobilkomponensek és a bejelentkezési modul lintellenőrzése sikeres. A teljes Expo lint a már meglévő eseményűrlapok és betöltési effektek miatt hibázik, ezek a korábbi kódhoz tartoznak.
- 22 SQL-migráció lefuttatása elkülönített PGlite PostgreSQL-kompatibilis adatbázison.
- HTTP smoke teszt: regisztráció, duplikált email, szerepkör nélküli néző, hitelesítés, mind a négy kedvenc-típus, kedvencek elkülönítése és duplikációja, negatív és érvénytelen lövésszám, jogosulatlan mérkőzésmódosítás, mérkőzésállapot, labdabirtoklás váltása és félidő alatti változatlansága.

## Kézi ellenőrzés a fejlesztői gépen

1. Frissítés a GitHubról; a helyi adatbázison az új migráció telepítése: az `apps/api` könyvtárban `npx prisma migrate deploy`, majd `npx prisma generate`.
2. Backend: `npm test -- --runInBand`, majd `npm run start:dev`.
3. Web: az `apps/web` könyvtárban `npm run dev`; nyisd meg a Favorites oldalt. Regisztrálj két tesztfelhasználót, mindkettőnél próbáld a négy típust hozzáadni és eltávolítani. Ellenőrizd, hogy nem látják egymás kedvenceit.
4. Mérkőzésadmin oldalon egy még el nem kezdett mérkőzésen engedélyezd a statisztikákat. Indítsd el, mindkét csapatnál rögzíts lövéseket, majd csökkentsd az értéket. Nulla alá nem mehet.
5. Válassz birtokló csapatot, várj néhány másodpercet, válts csapatot. Nyisd meg nyilvános nézetben, ellenőrizd a százalékokat. Félidőben az érték ne változzon; a második félidőben válassz újra csapatot.
6. Mobil: az `apps/mobile` könyvtárban `npx expo start --lan`. Ellenőrizd ugyanazokat a műveleteket, valamint hogy az alkalmazás bezárása és újranyitása után az adatok megmaradnak.

Az elkülönített adatbázisos és automatikus ellenőrzések megtörténtek, de a fizikai eszközön végzett kézi mobilos használhatósági teszt még hátravan.

## Kiegészítés – kedvencek közvetlen megjelölése a webes felületen

- A csapat, játékos és mérkőzés részletező oldalán, valamint a bajnokságok paneljein bejelentkezett nézőként üres vagy kitöltött csillag jelzi a kedvenc állapotot.
- A csillag egyetlen kattintással hozzáadja vagy eltávolítja az elemet. A Favorites oldal és a részletező oldalak közös állapotot használnak, amelyet a szerver adatai alapján frissítünk.
- Kijelentkezve a csillagok nem láthatók; lejárt munkamenet esetén a felület új bejelentkezést kér. A gombok billentyűzettel és képernyőolvasóval használhatók.
- Nincs új adatbázis-migráció vagy API-végpont; a meglévő kedvencek végpontjai változatlanok.
- Ellenőrzés: web build, ESLint és DOM-integrációs próba valós teszt-API-val (mind a négy típus, mentés, újratöltés, lista szinkronja, eltávolítás, kijelentkezés).

## Kiegészítés – mobilos kedvencek, kiállítás és navigáció

- A mobilos kedvencek ugyanazt az API-t használják; az üres és kitöltött csillag a bejelentkezett felhasználó mentett elemeinek állapotát jelzi.
- A kiállítás a kezdőcsapatból és a mérkőzéseseményekből számított játékosállapotot módosítja. A kiállított játékos a továbbiakban nem szerepelhet gólszerzőként, gólpasszt adóként vagy cserében; a cserepadon kiállított játékos nem léphet pályára. A visszadátumozott kiállítás ütköző későbbi esemény esetén elutasításra kerül.
- A mérkőzések nyilvános adatlapjairól megnyithatók a csapatok, játékosok és a bajnokság. Mobilon Expo Router segítségével külön adatlapok és visszalépési útvonalak készültek; a kedvencek menüből is elérhetők.
- Automatizált ellenőrzés: 20 tesztcsomag, 155 sikeres backendteszt, sikeres backend és web build, web ESLint, mobil TypeScript, Android JavaScript-csomag export. A csillagok, piros lap és navigáció működését Viktor a saját eszközén is visszaigazolta. A teljes mobilos ESLint továbbra is jelez korábban meglévő problémákat.
- E változtatásokhoz nem kellett új adatbázis-migráció; a navigáció miatt új mobilos függőségeket kell telepíteni (`npm ci`).
