
import {
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import {
  IsStandingsTieBreakers,
  StandingsTieBreaker,
} from '../standings-tiebreaker';

export class UpdateCompetitionDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsStandingsTieBreakers()
  standingsTieBreakers?: StandingsTieBreaker[];
}
