import { SetMetadata } from '@nestjs/common';

export const MATCH_ACCESS_KEY = 'matchAccess';

export type MatchAccessSource =
  | 'matchIdParam'
  | 'eventIdParam'
  | 'squadEntryId'
  | 'bodyMatchId';

export const MatchAccess = (source: MatchAccessSource) =>
  SetMetadata(MATCH_ACCESS_KEY, source);