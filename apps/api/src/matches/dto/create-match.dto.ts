import { IsDateString, IsNumber } from 'class-validator';

export class CreateMatchDto {
  @IsNumber()
  homeTeamId!: number;

  @IsNumber()
  awayTeamId!: number;

  @IsDateString()
  date!: string;
}