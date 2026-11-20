import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min, Max } from 'class-validator';
import { MatchStatus } from '../../../generated/prisma/client';

const positiveId = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^[1-9][0-9]*$/.test(value) ? Number(value) : value;

export class MatchFiltersDto {
  @IsOptional()
  @Transform(positiveId)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  seasonId?: number;

  @IsOptional()
  @Transform(positiveId)
  @IsInt()
  @Min(1)
  @Max(2147483647)
  teamId?: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
