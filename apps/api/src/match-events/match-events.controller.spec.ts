import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { MatchAccessGuard } from '../auth/match-access.guard';
import { RolesGuard } from '../auth/roles.guard';
import { MatchEventsController } from './match-events.controller';
import { MatchEventsService } from './match-events.service';

describe('MatchEventsController', () => {
  let controller: MatchEventsController;

  const matchEventsServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchEventsController],
      providers: [
        {
          provide: MatchEventsService,
          useValue: matchEventsServiceMock,
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
      .overrideGuard(MatchAccessGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<MatchEventsController>(
      MatchEventsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});