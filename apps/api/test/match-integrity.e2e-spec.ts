import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

// Run only against a disposable, migrated PostgreSQL database.
const suite = process.env.RUN_DB_INTEGRATION === '1' ? describe : describe.skip;
suite('Match integrity (real database + HTTP)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let competitionId: number;
  let matchId: number;
  let homeId: number;
  let adminId: number;
  let viewerId: number;
  let adminToken: string;
  let viewerToken: string;
  let starter: number;
  let substitute1: number;
  let substitute2: number;
  let seasonId: number;
  let awayId: number;
  let squadMatchId: number;
  const unique = Date.now() + '-' + Math.random().toString(36).slice(2);
  const password = 'IntegrationTest123!';

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    db = module.get(PrismaService);
    const http = request(app.getHttpServer());
    const adminEmail = 'admin-' + unique + '@example.test';
    const viewerEmail = 'viewer-' + unique + '@example.test';
    adminId = (await http.post('/auth/register').send({ email: adminEmail, password }).expect(201)).body.id;
    viewerId = (await http.post('/auth/register').send({ email: viewerEmail, password }).expect(201)).body.id;
    await db.roleAssignment.create({ data: { userId: adminId, role: 'SYSTEM_ADMIN' } });
    adminToken = (await http.post('/auth/login').send({ email: adminEmail, password }).expect(200)).body.accessToken;
    viewerToken = (await http.post('/auth/login').send({ email: viewerEmail, password }).expect(200)).body.accessToken;
    const competition = await db.competition.create({ data: { name: 'Integration ' + unique } });
    competitionId = competition.id;
    const season = await db.season.create({ data: { name: 'Test', competitionId } });
    seasonId = season.id;
    const home = await db.team.create({ data: { name: 'Home', seasonId: season.id } });
    homeId = home.id;
    const away = await db.team.create({ data: { name: 'Away', seasonId: season.id } });
    awayId = away.id;
    const match = await db.match.create({ data: { date: new Date(), homeTeamId: homeId, awayTeamId: away.id, seasonId: season.id, status: 'LIVE', actualStartedAt: new Date() } });
    matchId = match.id;
    const player = async (name: string, role: 'STARTER' | 'SUBSTITUTE') => {
      const p = await db.player.create({ data: { firstName: name, lastName: 'Test', teamId: homeId } });
      await db.matchSquadPlayer.create({ data: { matchId, teamId: homeId, playerId: p.id, role } });
      return p.id;
    };
    starter = await player('Starter', 'STARTER');
    substitute1 = await player('Sub1', 'SUBSTITUTE');
    substitute2 = await player('Sub2', 'SUBSTITUTE');
  }, 30_000);

  afterAll(async () => {
    if (!db) return;
    try {
      if (matchId) await db.match.delete({ where: { id: matchId } });
      if (squadMatchId) await db.match.delete({ where: { id: squadMatchId } });
      if (homeId) await db.player.deleteMany({ where: { teamId: homeId } });
      if (competitionId) await db.competition.delete({ where: { id: competitionId } });
      await db.user.deleteMany({ where: { id: { in: [adminId, viewerId].filter(Boolean) } } });
    } finally {
      await app.close();
    }
  });

  it('isolates favorites and rejects unauthorized edits', async () => {
    const http = request(app.getHttpServer());
    await http.put('/favorites/match/' + matchId).set('Authorization', 'Bearer ' + viewerToken).expect(200);
    const adminFavorites = await http.get('/favorites').set('Authorization', 'Bearer ' + adminToken).expect(200);
    expect(adminFavorites.body).toEqual([]);
    await http.post('/match-events').set('Authorization', 'Bearer ' + viewerToken)
      .send({ matchId, teamId: homeId, type: 'GOAL', minute: 1 }).expect(403);
    await http.get('/matches?teamId=abc').expect(400);
  });

  it('serializes concurrent substitutions, rolls back invalid corrections and dismisses at two yellows', async () => {
    const http = request(app.getHttpServer());
    const auth = 'Bearer ' + adminToken;
    const create = (data: object) => http.post('/match-events').set('Authorization', auth).send({ matchId, teamId: homeId, ...data });
    const results = await Promise.all([substitute1, substitute2].map(playerInId =>
      create({ type: 'SUBSTITUTION', minute: 15, playerOutId: starter, playerInId })));
    expect(results.map(result => result.status).sort()).toEqual([201, 400]);
    const sub = results.find(result => result.status === 201)!.body;
    const scorer = sub.playerInId;
    const goal = await create({ type: 'GOAL', minute: 20, playerId: scorer }).expect(201);
    await http.delete('/match-events/' + sub.id).set('Authorization', auth).expect(400);
    expect(await db.matchEvent.findUnique({ where: { id: sub.id } })).not.toBeNull();
    expect(await db.matchEvent.findUnique({ where: { id: goal.body.id } })).not.toBeNull();
    await create({ type: 'YELLOW_CARD', minute: 25, playerId: scorer }).expect(201);
    const second = await create({ type: 'YELLOW_CARD', minute: 30, playerId: scorer }).expect(201);
    await create({ type: 'GOAL', minute: 31, playerId: scorer }).expect(400);
    const history = await http.get('/match-events/match/' + matchId).expect(200);
    expect(history.body.find(event => event.id === second.body.id).isSecondYellow).toBe(true);
    await http.delete('/match-events/' + second.body.id).set('Authorization', auth).expect(200);
    await create({ type: 'GOAL', minute: 31, playerId: scorer }).expect(201);
    expect((await db.match.findUniqueOrThrow({ where: { id: matchId } })).homeScore).toBe(2);
  }, 30_000);

  it('allows only one concurrent addition to a ten-player starting lineup', async () => {
    const match = await db.match.create({ data: {
      date: new Date(), homeTeamId: homeId, awayTeamId: awayId, seasonId, status: 'PRE_MATCH',
    } });
    squadMatchId = match.id;
    const players = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      db.player.create({ data: { firstName: 'Squad' + i, lastName: 'Test', teamId: homeId } })));
    await db.matchSquadPlayer.createMany({ data: players.slice(0, 10).map(p => ({
      matchId: squadMatchId, teamId: homeId, playerId: p.id, role: 'STARTER',
    })) });
    const http = request(app.getHttpServer());
    const auth = 'Bearer ' + adminToken;
    const results = await Promise.all(players.slice(10).map(p =>
      http.post('/match-squads').set('Authorization', auth).send({
        matchId: squadMatchId, teamId: homeId, playerId: p.id, role: 'STARTER',
      })));
    expect(results.map(r => r.status).sort()).toEqual([201, 400]);
    expect(await db.matchSquadPlayer.count({ where: { matchId: squadMatchId, teamId: homeId, role: 'STARTER' } })).toBe(11);
    const remaining = players.slice(10).find(p => p.id !== results.find(r => r.status === 201)!.body.playerId)!;
    const substitute = await http.post('/match-squads').set('Authorization', auth).send({
      matchId: squadMatchId, teamId: homeId, playerId: remaining.id, role: 'SUBSTITUTE',
    }).expect(201);
    await http.patch('/match-squads/' + substitute.body.id).set('Authorization', auth).send({ role: 'STARTER' }).expect(400);
  }, 30_000);

  it('stores a randomly generated season draw seed and returns stable standings', async () => {
    const season = await db.season.findUniqueOrThrow({ where: { id: seasonId } });
    expect(season.standingsDrawSeed).toMatch(/^[0-9a-f-]{36}$/i);
    const http = request(app.getHttpServer());
    const auth = 'Bearer ' + adminToken;
    const status = (value: string) => http.patch('/matches/' + squadMatchId + '/status')
      .set('Authorization', auth).send({ status: value });
    await status('LIVE').expect(200);
    const selected = await db.matchSquadPlayer.findFirstOrThrow({ where: {
      matchId: squadMatchId, teamId: homeId, role: 'STARTER',
    } });
    const card = await http.post('/match-events').set('Authorization', auth).send({
      matchId: squadMatchId, teamId: homeId, playerId: selected.playerId, type: 'YELLOW_CARD', minute: 10,
    }).expect(201);
    await status('HALF_TIME').expect(200);
    await status('LIVE').expect(200);
    await status('HALF_TIME').expect(400);
    await status('FINISHED').expect(200);
    const fairPlay = await http.get('/seasons/' + seasonId + '/standings').expect(200);
    expect(fairPlay.body.map(t => t.teamId)).toEqual([awayId, homeId]);
    await http.delete('/match-events/' + card.body.id).set('Authorization', auth).expect(200);
    const first = await http.get('/seasons/' + seasonId + '/standings').expect(200);
    const second = await http.get('/seasons/' + seasonId + '/standings').expect(200);
    expect(second.body).toEqual(first.body);
  }, 30_000);
});
