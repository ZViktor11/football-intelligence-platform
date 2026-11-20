import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { Role } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { SeasonsController } from '../seasons/seasons.controller';
import { SeasonsService } from '../seasons/seasons.service';
import { TeamsController } from '../teams/teams.controller';
import { TeamsService } from '../teams/teams.service';
import { PlayersController } from '../players/players.controller';
import { PlayersService } from '../players/players.service';
import { StaffMembersController } from '../staff-members/staff-members.controller';
import { StaffMembersService } from '../staff-members/staff-members.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { CompetitionCreateAccessGuard } from './competition-create-access.guard';

describe('Security HTTP boundaries (real guards, mocked persistence)', () => {
  let app: INestApplication;
  const create = jest.fn((body: object) => ({ id: 1, ...body }));
  const userList = jest.fn(() => [{ id: 1, email: 'admin@example.test' }]);
  const getUserRoles = jest.fn(async (id: number) => {
    if (id === 1) return [{ role: Role.SYSTEM_ADMIN, competitionId: null }];
    if (id === 2) return [{ role: Role.COMPETITION_ADMIN, competitionId: 10 }];
    if (id === 3) return [{ role: Role.MATCH_ADMIN, competitionId: null }];
    return [];
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        UsersController,
        SeasonsController,
        TeamsController,
        PlayersController,
        StaffMembersController,
        AuthController,
      ],
      providers: [
        AuthGuard,
        RolesGuard,
        CompetitionCreateAccessGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: async (token: string) => {
              if (!/^user-[1-5]$/.test(token)) throw new Error('invalid token');
              return { sub: Number(token.slice(5)) };
            },
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: async ({ where }: { where: { id: number } }) => ({
                isActive: where.id !== 5,
              }),
            },
            season: {
              findUnique: async ({ where }: { where: { id: number } }) => ({
                competitionId: where.id === 100 ? 10 : 20,
              }),
            },
            team: {
              findUnique: async ({ where }: { where: { id: number } }) => ({
                season: { competitionId: where.id === 1000 ? 10 : 20 },
              }),
            },
          },
        },
        { provide: AuthService, useValue: { getUserRoles } },
        {
          provide: UsersService,
          useValue: { findAll: userList, findOne: (id: number) => ({ id }) },
        },
        { provide: SeasonsService, useValue: { create, findAll: () => [] } },
        { provide: TeamsService, useValue: { create, findAll: () => [] } },
        { provide: PlayersService, useValue: { create, findAll: () => [] } },
        {
          provide: StaffMembersService,
          useValue: { create, findAll: () => [] },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  beforeEach(() => {
    create.mockClear();
    userList.mockClear();
  });

  it.each(['/users', '/users/1'])(
    'requires authentication for %s',
    async (path) => {
      await request(app.getHttpServer()).get(path).expect(401);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer user-4')
        .expect(403);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer user-2')
        .expect(403);
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', 'Bearer user-1')
        .expect(200);
    },
  );
  it('blocks an inactive account with a previously issued JWT', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer user-5')
      .expect(401);
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer user-4')
      .expect(200);
  });
  it.each([
    {
      path: '/seasons',
      own: { name: 'Season', competitionId: 10 },
      other: { name: 'Season', competitionId: 20 },
    },
    {
      path: '/teams',
      own: { name: 'Test team', seasonId: 100 },
      other: { name: 'Test team', seasonId: 200 },
    },
    {
      path: '/players',
      own: { firstName: 'Test', lastName: 'Player', teamId: 1000 },
      other: { firstName: 'Test', lastName: 'Player', teamId: 2000 },
    },
    {
      path: '/staff-members',
      own: {
        firstName: 'Test',
        lastName: 'Coach',
        role: 'HEAD_COACH',
        teamId: 1000,
      },
      other: {
        firstName: 'Test',
        lastName: 'Coach',
        role: 'HEAD_COACH',
        teamId: 2000,
      },
    },
  ])(
    'enforces the competition boundary on $path',
    async ({ path, own, other }) => {
      const server = app.getHttpServer();
      await request(server).post(path).send(own).expect(401);
      await request(server)
        .post(path)
        .set('Authorization', 'Bearer user-4')
        .send(own)
        .expect(403);
      await request(server)
        .post(path)
        .set('Authorization', 'Bearer user-3')
        .send(own)
        .expect(403);
      await request(server)
        .post(path)
        .set('Authorization', 'Bearer user-2')
        .send(other)
        .expect(403);
      expect(create).not.toHaveBeenCalled();
      await request(server)
        .post(path)
        .set('Authorization', 'Bearer user-2')
        .send(own)
        .expect(201);
      await request(server)
        .post(path)
        .set('Authorization', 'Bearer user-1')
        .send(other)
        .expect(201);
      expect(create).toHaveBeenCalledTimes(2);
      await request(server).get(path).expect(200);
    },
  );
});
