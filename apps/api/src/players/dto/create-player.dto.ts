import { IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePlayerDto {
  @ApiProperty({
    example: 'Haaland',
    description: 'Player name',
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 300,
    description: 'Total goals scored',
  })
  @IsNumber()
  goals: number;
}