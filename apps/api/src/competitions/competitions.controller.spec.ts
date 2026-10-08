
import { Test, TestingModule } from '@nestjs/testing';

import { AuthGuard } from '../auth/auth.guard';
import { CompetitionAccessGuard } from '../auth/competition-access.guard';
import { RolesGuard } from '../auth/roles.guard';

import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';

describe('CompetitionsController', () => {
  let controller: CompetitionsController;

  const competitionsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [CompetitionsController],
        providers: [
          {
            provide: CompetitionsService,
            useValue: competitionsServiceMock,
          },
        ],
      })
        .overrideGuard(AuthGuard)
        .useValue({
          canActivate: jest.fn(() => true),
        })
        .overrideGuard(RolesGuard)
        .useValue({
          canActivate: jest.fn(() => true),
        })
        .overrideGuard(CompetitionAccessGuard)
        .useValue({
          canActivate: jest.fn(() => true),
        })
        .compile();

    controller = module.get<CompetitionsController>(
      CompetitionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return all competitions', async () => {
    const competitions = [
      { id: 1, name: 'Szeged Amateur League' },
    ];

    competitionsServiceMock.findAll.mockResolvedValue(
      competitions,
    );

    await expect(controller.findAll()).resolves.toEqual(
      competitions,
    );
  });

  it('should return a competition by ID', async () => {
    const competition = {
      id: 1,
      name: 'Szeged Amateur League',
    };

    competitionsServiceMock.findOne.mockResolvedValue(
      competition,
    );

    await expect(controller.findOne(1)).resolves.toEqual(
      competition,
    );

    expect(competitionsServiceMock.findOne).toHaveBeenCalledWith(
      1,
    );
  });

  it('should update a competition', async () => {
    const updateDto = {
      name: 'Updated League',
    };

    const updatedCompetition = {
      id: 1,
      ...updateDto,
    };

    competitionsServiceMock.update.mockResolvedValue(
      updatedCompetition,
    );

    await expect(
      controller.update(1, updateDto),
    ).resolves.toEqual(updatedCompetition);

    expect(competitionsServiceMock.update).toHaveBeenCalledWith(
      1,
      updateDto,
    );
  });
});
