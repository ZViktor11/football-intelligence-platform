import {
  IsEnum,
  IsInt,
  IsString,
} from 'class-validator';

import { StaffRole } from '../../../generated/prisma/client';

export class CreateStaffMemberDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEnum(StaffRole)
  role: StaffRole;

  @IsInt()
  teamId: number;
}