import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  getAllPlayers() {
    return this.playersService.getAllPlayers();
  }

  @Get(':id')
  getPlayerById(@Param('id') id: string) {
    return this.playersService.getPlayerById(Number(id));
  }

  @Post()
  createPlayer(@Body() playerData: CreatePlayerDto) {
    return this.playersService.createPlayer(playerData);
  }

  @Put(':id')
updatePlayer(
  @Param('id') id: string,
  @Body() playerData: CreatePlayerDto,
) {
  return this.playersService.updatePlayer(Number(id), playerData);
}

@Delete(':id')
deletePlayer(@Param('id') id: string) {
  return this.playersService.deletePlayer(Number(id));
}
}