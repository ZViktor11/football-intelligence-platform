import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMatchReportDto {
  @IsInt()
  matchId: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(2000)
  message: string;
}