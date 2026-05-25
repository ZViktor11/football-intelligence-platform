import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class PlayersService {
  private players = [
    { id: 1, name: 'Messi', goals: 821 },
    { id: 2, name: 'Ronaldo', goals: 895 },
  ];

  getAllPlayers() {
    return this.players;
  }

  getPlayerById(id: number) {
    const player = this.players.find((player) => player.id === id);

    if (!player) {
      throw new NotFoundException('Player not found');
    }

    return player;
  }

  createPlayer(playerData: { name: string; goals: number }) {
    const newPlayer = {
      id: this.players.length + 1,
      ...playerData,
    };

    this.players.push(newPlayer);

    return newPlayer;
  }

  updatePlayer(id: number, playerData: { name: string; goals: number }) {
  const playerIndex = this.players.findIndex((player) => player.id === id);

  if (playerIndex === -1) {
    throw new NotFoundException('Player not found');
  }

  this.players[playerIndex] = {
    id,
    ...playerData,
  };

  return this.players[playerIndex];
}

deletePlayer(id: number) {
  const playerIndex = this.players.findIndex((player) => player.id === id);

  if (playerIndex === -1) {
    throw new NotFoundException('Player not found');
  }

  this.players.splice(playerIndex, 1);

  return {
    message: 'Player deleted successfully',
  };
}
}