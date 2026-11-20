import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MatchFiltersDto } from './match-filters.dto';

describe('Match filters', () => {
  it.each(['0', '-1', 'abc', '1.5', '', ['1', '2']])('rejects invalid ID %j', async value => {
    expect(await validate(plainToInstance(MatchFiltersDto, { teamId: value }))).not.toHaveLength(0);
  });
  it('rejects invalid status', async () => {
    expect(await validate(plainToInstance(MatchFiltersDto, { status: 'WRONG' }))).not.toHaveLength(0);
  });
  it('accepts valid optional filters', async () => {
    const dto = plainToInstance(MatchFiltersDto, { seasonId: '3', teamId: '9', status: 'LIVE' });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.teamId).toBe(9);
    expect(await validate(new MatchFiltersDto())).toHaveLength(0);
  });
});
