# Football Intelligence Platform

Élő labdarúgó-mérkőzések követése, eseményrögzítés, játékos- és csapatadatok, tabellák, kedvencek és mérkőzésstatisztikák.

## Helyi fejlesztés Windows / PowerShell környezetben

Előfeltételek: Node.js 24, npm, Git, Docker Desktop (PostgreSQL 16). Az alábbi folyamat a repository gyökeréből indul.

```powershell
docker compose up -d
cd apps/api
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

A generált véletlen értéket a `.env` fájlban a `JWT_SECRET` beállításba kell másolni. A mintakonfiguráció csak helyi fejlesztésre való. Ha már van működő `.env`, ne írd felül: ellenőrizd a beállításokat.

```powershell
npx prisma migrate deploy
npx prisma generate
npm run build
npm test -- --runInBand
npm run start:dev
```

Az API a 3000-es porton, a Swagger dokumentáció a http://localhost:3000/api címen érhető el.

### Opcionális demóadatok

Külön terminálban, az `apps/api` könyvtárból, a fejlesztői adatbázis elindítása és build után:

```powershell
$env:ALLOW_DEMO_SEED = "1"
$env:DEMO_ADMIN_PASSWORD = Read-Host "Demo admin jelszó, legalább 12 karakter"
npm run seed:demo
Remove-Item Env:DEMO_ADMIN_PASSWORD
Remove-Item Env:ALLOW_DEMO_SEED
```

A bejelentkezési cím `demo-admin@example.test`. A parancs négy demócsapatot, csapatonként 14 játékost, négy mérkőzést és a kezdő kereteket hozza létre. Nem törli a meglévő adatokat, ismételt futtatáskor nem írja át a már létező demóadmin jelszavát. Éles adatbázisban ne futtasd.

### Web

Új terminál, a repository gyökeréből:

```powershell
cd apps/web
npm ci
npm run dev
```

Alapértelmezett cím: http://localhost:5173. Más API-címhez állítsd be a `VITE_API_URL` változót az `apps/web/.env.local` fájlban. Az API `CORS_ORIGINS` változójába a megengedett webes origin kerül (több cím vesszővel elválasztva).

### Mobil

A telefon és a számítógép ugyanazon a helyi hálózaton legyen. Az `ipconfig` alapján az `apps/mobile/.env.local` fájlba kerüljön a számítógép Wi-Fi IPv4 címe, például `EXPO_PUBLIC_API_URL=http://192.168.1.100:3000`. A Windows tűzfalon csak a szükséges helyi hozzáférést engedélyezd.

```powershell
cd apps/mobile
npm ci
npx tsc --noEmit
npm run lint
npx expo start --clear --lan
```

## Automatikus ellenőrzések

A GitHub Actions a backend teszteket, a PostgreSQL 16 adatbázisos HTTP-teszteket, a web buildet/lintet, valamint a mobil TypeScript, lint és Android export ellenőrzéseket futtatja. A folyamat nem telepít éles rendszert.

A teljes adatbázisos teszt futtatásához külön, eldobható PostgreSQL adatbázis szükséges. Ne használd a saját fejlesztői vagy éles adatbázisodat ezzel a teszttel. Az `apps/api` könyvtárból, a tesztadatbázis elérhetőségének beállítása után:

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/football_test"
$env:JWT_SECRET = "local-integration-test-secret-not-for-production"
$env:RUN_DB_INTEGRATION = "1"
npx prisma migrate deploy
npm run test:e2e -- --runInBand
Remove-Item Env:RUN_DB_INTEGRATION
Remove-Item Env:DATABASE_URL
Remove-Item Env:JWT_SECRET
```

Éles használat előtt külön PostgreSQL-felhasználó, egyedi erős jelszó, HTTPS, megfelelő proxy- és CORS-beállítás, titokkezelés és mentési stratégia szükséges. A helyi Docker adatbázis-port csak a host loopback címére van kötve. A belépési limit egy futó API-példányra vonatkozik; több szerverpéldány esetén megosztott rate-limit tároló szükséges.
