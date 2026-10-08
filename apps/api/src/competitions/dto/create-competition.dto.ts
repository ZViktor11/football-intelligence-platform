
import {
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import {
  IsStandingsTieBreakers,
  StandingsTieBreaker,
} from '../standings-tiebreaker';

export class CreateCompetitionDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsStandingsTieBreakers()
  standingsTieBreakers?: StandingsTieBreaker[];
}
