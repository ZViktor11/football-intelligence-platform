import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsInt()
  seasonId: number;
}