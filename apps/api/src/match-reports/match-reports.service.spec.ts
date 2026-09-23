import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  MatchReportStatus,
} from '../../generated/prisma/client';

import { MatchReportsService } from './match-reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MatchReportsService', () => {
  let service: MatchReportsService;

  const prismaMock = {
    match: {
      findUnique: jest.fn(),
    },
    matchReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          MatchReportsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    service =
      module.get<MatchReportsService>(
        MatchReportsService,
      );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a report for a finished match', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'FINISHED',
      });

      prismaMock.matchReport.create.mockResolvedValue({
        id: 1,
        matchId: 1,
        authorId: 9,
        message: 'Wrong goal scorer',
        status: MatchReportStatus.OPEN,
      });

      const result = await service.create(
        {
          matchId: 1,
          message: '  Wrong goal scorer  ',
        },
        9,
      );

      expect(
        prismaMock.matchReport.create,
      ).toHaveBeenCalledWith({
        data: {
          matchId: 1,
          authorId: 9,
          message: 'Wrong goal scorer',
        },
      });

      expect(result.status).toBe(
        MatchReportStatus.OPEN,
      );
    });

    it('should reject a report before the match is finished', async () => {
      prismaMock.match.findUnique.mockResolvedValue({
        id: 1,
        status: 'LIVE',
      });

      await expect(
        service.create(
          {
            matchId: 1,
            message: 'Wrong goal scorer',
          },
          9,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(
        prismaMock.matchReport.create,
      ).not.toHaveBeenCalled();
    });

    it('should reject a report for a nonexistent match', async () => {
      prismaMock.match.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.create(
          {
            matchId: 999,
            message: 'Something is wrong',
          },
          9,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should resolve an open report and store review audit data', async () => {
      prismaMock.matchReport.findUnique.mockResolvedValue({
        id: 1,
        status: MatchReportStatus.OPEN,
      });

      prismaMock.matchReport.update.mockImplementation(
        ({ data }) => ({
          id: 1,
          ...data,
        }),
      );

      const result =
        await service.updateStatus(
          1,
          MatchReportStatus.RESOLVED,
          1,
        );

      expect(
        prismaMock.matchReport.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          status: MatchReportStatus.RESOLVED,
          reviewedById: 1,
          reviewedAt: expect.any(Date),
        },
        include: {
          reviewedBy: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(result.status).toBe(
        MatchReportStatus.RESOLVED,
      );

      expect(result.reviewedById).toBe(1);
      expect(result.reviewedAt).toEqual(
        expect.any(Date),
      );
    });

    it('should reject changing a report back to OPEN', async () => {
      prismaMock.matchReport.findUnique.mockResolvedValue({
        id: 1,
        status: MatchReportStatus.RESOLVED,
      });

      await expect(
        service.updateStatus(
          1,
          MatchReportStatus.OPEN,
          1,
        ),
      ).rejects.toThrow(BadRequestException);

      expect(
        prismaMock.matchReport.update,
      ).not.toHaveBeenCalled();
    });

    it('should reject updating a nonexistent report', async () => {
      prismaMock.matchReport.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.updateStatus(
          999,
          MatchReportStatus.RESOLVED,
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});