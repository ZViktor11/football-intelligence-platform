import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePlayerDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsInt()
  teamId?: number;
}