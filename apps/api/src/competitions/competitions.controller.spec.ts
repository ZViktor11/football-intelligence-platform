import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';

describe('CompetitionsController', () => {
  let controller: CompetitionsController;

  const competitionsServiceMock = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
      .compile();

    controller = module.get<CompetitionsController>(
      CompetitionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});