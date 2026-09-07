import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CompetitionsModule } from './competitions/competitions.module';
import { SeasonsModule } from './seasons/seasons.module';
import { TeamsModule } from './teams/teams.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { MatchEventsModule } from './match-events/match-events.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, CompetitionsModule, SeasonsModule, TeamsModule, PlayersModule, MatchesModule, MatchEventsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}