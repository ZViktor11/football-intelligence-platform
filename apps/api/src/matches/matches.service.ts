import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  create(createMatchDto: CreateMatchDto) {
    return this.prisma.match.create({
      data: {
        homeTeamId: createMatchDto.homeTeamId,
        awayTeamId: createMatchDto.awayTeamId,
        date: new Date(createMatchDto.date),
      },
    });
  }

  findAll() {
    return this.prisma.match.findMany({
      include: {
        homeTeam: true,
        awayTeam: true,
      },
    });
  }
}