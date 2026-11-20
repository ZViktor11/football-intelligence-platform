import { IsBoolean, IsEnum, IsIn, ValidateIf } from 'class-validator';
import { PossessionSide } from '../../../generated/prisma/client';

export class MatchStatisticsSettingsDto {
  @IsBoolean()
  shotsOnTargetEnabled: boolean;

  @IsBoolean()
  possessionEnabled: boolean;
}

export class ShotDeltaDto {
  @IsEnum(PossessionSide)
  side: PossessionSide;

  @IsIn([-1, 1])
  delta: number;
}

export class PossessionDto {
  @ValidateIf((_object, value) => value !== null)
  @IsEnum(PossessionSide)
  side: PossessionSide | null;
}
