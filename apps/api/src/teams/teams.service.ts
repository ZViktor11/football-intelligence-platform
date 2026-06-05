import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  create(createTeamDto: CreateTeamDto) {
    return this.prisma.team.create({
      data: createTeamDto,
    });
  }

  findAll() {
    return this.prisma.team.findMany({
      include: {
        players: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.team.findUnique({
      where: { id },
      include: {
        players: true,
      },
    });
  }

  update(id: number, updateTeamDto: UpdateTeamDto) {
  return this.prisma.team.update({
    where: { id },
    data: updateTeamDto,
  });
}

remove(id: number) {
  return this.prisma.team.delete({
    where: { id },
  });
}


}

