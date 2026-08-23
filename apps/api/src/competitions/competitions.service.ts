import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createCompetitionDto: CreateCompetitionDto) {
    return this.prisma.competition.create({
      data: {
        name: createCompetitionDto.name,
        description: createCompetitionDto.description,
      },
    });
  }

  findAll() {
    return this.prisma.competition.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const competition = await this.prisma.competition.findUnique({
      where: {
        id,
      },
    });

    if (!competition) {
      throw new NotFoundException(
        `Competition with ID ${id} not found`,
      );
    }

    return competition;
  }

  async update(id: number, updateCompetitionDto: UpdateCompetitionDto) {
  await this.findOne(id);

  return this.prisma.competition.update({
    where: { id },
    data: updateCompetitionDto,
  });
}
}