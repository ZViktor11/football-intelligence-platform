import { IsEnum, IsInt, IsOptional } from 'class-validator';

export enum EventTypeDto {
  GOAL = 'GOAL',
  ASSIST = 'ASSIST',
  YELLOW_CARD = 'YELLOW_CARD',
  RED_CARD = 'RED_CARD',
  SUBSTITUTION = 'SUBSTITUTION',
}

export class CreateEventDto {
  @IsEnum(EventTypeDto)
  type!: EventTypeDto;

  @IsInt()
  minute!: number;

  @IsInt()
  matchId!: number;

  @IsOptional()
  @IsInt()
  teamId?: number;

  @IsOptional()
  @IsInt()
  playerId?: number;
}