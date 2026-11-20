import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';

type AuthenticatedRequest = Request & { user: { sub: number } };
const fields = {
  team: 'teamId',
  player: 'playerId',
  competition: 'competitionId',
  match: 'matchId',
} as const;

@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@Req() request: AuthenticatedRequest) {
    return this.prisma.favorite.findMany({
      where: { userId: request.user.sub },
      include: {
        team: { select: { id: true, name: true } },
        player: { select: { id: true, firstName: true, lastName: true } },
        competition: { select: { id: true, name: true } },
        match: {
          select: {
            id: true,
            date: true,
            homeTeam: { select: { name: true } },
            awayTeam: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Put(':type/:id')
  async add(
    @Req() request: AuthenticatedRequest,
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const target = this.target(type, id);
    try {
      await this.prisma.favorite.createMany({
        data: [{ userId: request.user.sub, ...target }],
        skipDuplicates: true,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('Favorite target does not exist');
      }
      throw error;
    }
    return { saved: true };
  }

  @Delete(':type/:id')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('type') type: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.prisma.favorite.deleteMany({
      where: { userId: request.user.sub, ...this.target(type, id) },
    });
    return { saved: false };
  }

  private target(type: string, id: number) {
    if (!Object.hasOwn(fields, type) || id < 1) {
      throw new BadRequestException('Invalid favorite target');
    }
    return { [fields[type as keyof typeof fields]]: id };
  }
}
