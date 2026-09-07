import { IsDateString, IsInt } from 'class-validator';

export class CreateMatchDto {
  @IsDateString()
  date: string;

  @IsInt()
  homeTeamId: number;

  @IsInt()
  awayTeamId: number;

  @IsInt()
  seasonId: number;
}