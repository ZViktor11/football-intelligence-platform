import { IsString, IsOptional, IsInt } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsInt()
  leagueId?: number;
}