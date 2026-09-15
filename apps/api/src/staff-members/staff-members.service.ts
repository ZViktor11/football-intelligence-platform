import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';

@Injectable()
export class StaffMembersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStaffMemberDto: CreateStaffMemberDto) {
    const team = await this.prisma.team.findUnique({
      where: {
        id: createStaffMemberDto.teamId,
      },
    });

    if (!team) {
      throw new NotFoundException(
        `Team with ID ${createStaffMemberDto.teamId} not found`,
      );
    }

    return this.prisma.staffMember.create({
      data: {
        firstName: createStaffMemberDto.firstName,
        lastName: createStaffMemberDto.lastName,
        role: createStaffMemberDto.role,
        teamId: createStaffMemberDto.teamId,
      },
      include: {
        team: true,
      },
    });
  }

  findAll() {
    return this.prisma.staffMember.findMany({
      include: {
        team: true,
      },
      orderBy: [
        {
          teamId: 'asc',
        },
        {
          lastName: 'asc',
        },
        {
          firstName: 'asc',
        },
      ],
    });
  }

  async findOne(id: number) {
    const staffMember =
      await this.prisma.staffMember.findUnique({
        where: {
          id,
        },
        include: {
          team: true,
        },
      });

    if (!staffMember) {
      throw new NotFoundException(
        `Staff member with ID ${id} not found`,
      );
    }

    return staffMember;
  }
}