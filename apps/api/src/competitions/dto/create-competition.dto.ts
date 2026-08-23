import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}