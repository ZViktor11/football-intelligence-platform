import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { PlayersService } from './players.service';
import { CreatePlayerDto } from './dto/create-player.dto';

@Controller('players')
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get()
  getAllPlayers() {
    return this.playersService.findAll();
  }

  @Get(':id')
  getPlayerById(@Param('id') id: string) {
    return this.playersService.findOne(Number(id));
  }

  @Post()
  createPlayer(@Body() playerData: CreatePlayerDto) {
    return this.playersService.create(playerData);
  }

  @Put(':id')
  updatePlayer(
    @Param('id') id: string,
    @Body() playerData: CreatePlayerDto,
  ) {
    return this.playersService.update(Number(id), playerData);
  }

  @Delete(':id')
  deletePlayer(@Param('id') id: string) {
    return this.playersService.remove(Number(id));
  }
}