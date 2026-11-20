// Run after Prisma generation and build, against a development database only.
const { PrismaClient } = require('../dist/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const argon2 = require('argon2');

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_SEED !== '1' ||
    !process.env.DATABASE_URL || !process.env.DEMO_ADMIN_PASSWORD || process.env.DEMO_ADMIN_PASSWORD.length < 12) {
  throw new Error('Development only: set ALLOW_DEMO_SEED=1, DATABASE_URL and DEMO_ADMIN_PASSWORD (12+ characters)');
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function seed() {
  await db.$transaction(async tx => {
    const email = 'demo-admin@example.test';
    let admin = await tx.user.findUnique({ where: { email }, include: { roleAssignments: true } });
    if (admin && !admin.roleAssignments.some(role => role.role === 'SYSTEM_ADMIN')) {
      throw new Error('Demo email already belongs to a non-admin account; refusing to change its privileges');
    }
    if (!admin) {
      admin = await tx.user.create({ data: {
        email, firstName: 'Demo', lastName: 'Admin',
        passwordHash: await argon2.hash(process.env.DEMO_ADMIN_PASSWORD),
        roleAssignments: { create: { role: 'SYSTEM_ADMIN' } },
      } });
    }
    const name = 'Football Intelligence Demo League';
    let competition = await tx.competition.findFirst({ where: { name } });
    if (!competition) competition = await tx.competition.create({ data: { name } });
    const season = await tx.season.upsert({
      where: { competitionId_name: { competitionId: competition.id, name: 'Demo 2026/27' } },
      update: {}, create: { competitionId: competition.id, name: 'Demo 2026/27' },
    });
    const teams = [];
    for (const name of ['Demo Szeged FC', 'Demo Budapest FC', 'Demo Kecskemet FC', 'Demo Pecs FC']) {
      const team = await tx.team.upsert({
        where: { seasonId_name: { seasonId: season.id, name } },
        update: {}, create: { seasonId: season.id, name },
      });
      teams.push(team);
      for (let i = 1; i <= 14; i++) {
        const firstName = 'Demo';
        const lastName = 'Player ' + i;
        if (!await tx.player.findFirst({ where: { teamId: team.id, firstName, lastName } })) {
          await tx.player.create({ data: { teamId: team.id, firstName, lastName } });
        }
      }
    }
    for (const [home, away] of [[0, 1], [2, 3], [0, 2], [1, 3]]) {
      const fixture = { seasonId: season.id, homeTeamId: teams[home].id, awayTeamId: teams[away].id };
      let match = await tx.match.findFirst({ where: fixture });
      if (!match) match = await tx.match.create({ data: { ...fixture, date: new Date(Date.now() + 86400000) } });
      if (match.status === 'SCHEDULED' || match.status === 'PRE_MATCH') {
        for (const team of [teams[home], teams[away]]) {
          const players = await tx.player.findMany({ where: { teamId: team.id, firstName: 'Demo' }, orderBy: { id: 'asc' }, take: 14 });
          for (const [i, player] of players.entries()) {
            await tx.matchSquadPlayer.upsert({
              where: { matchId_playerId: { matchId: match.id, playerId: player.id } },
              update: {}, create: { matchId: match.id, playerId: player.id, teamId: team.id, role: i < 11 ? 'STARTER' : 'SUBSTITUTE' },
            });
          }
        }
      }
      console.log('Demo match:', match.id, teams[home].name, '-', teams[away].name);
    }
    console.log('Demo administrator:', email, '(existing password unchanged on subsequent runs)');
  }, { timeout: 60_000 });
}

seed().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
