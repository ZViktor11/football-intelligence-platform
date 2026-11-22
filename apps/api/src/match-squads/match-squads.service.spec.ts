import { MatchSquadsService } from './match-squads.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

describe('MatchSquadsService starter limits', () => {
  const tx = {
    match: { findUnique: jest.fn() },
    player: { findUnique: jest.fn() },
    matchSquadPlayer: { findUnique: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  };
  const db = { $transaction: jest.fn() };
  const service = new MatchSquadsService(db as unknown as PrismaService);
  const candidate = { matchId: 1, teamId: 2, playerId: 3, role: 'STARTER' as const };
  beforeEach(() => {
    jest.resetAllMocks();
    db.$transaction.mockImplementation(callback => callback(tx));
    tx.match.findUnique.mockResolvedValue({ status: 'PRE_MATCH', homeTeamId: 2, awayTeamId: 4 });
    tx.player.findUnique.mockResolvedValue({ teamId: 2 });
    tx.matchSquadPlayer.findUnique.mockResolvedValue(null);
    tx.matchSquadPlayer.count.mockResolvedValue(11);
    tx.matchSquadPlayer.create.mockResolvedValue(candidate);
    tx.matchSquadPlayer.update.mockResolvedValue(candidate);
  });
  it('rejects a twelfth starter', async () => {
    await expect(service.create(candidate)).rejects.toThrow('at most 11');
    expect(tx.matchSquadPlayer.create).not.toHaveBeenCalled();
  });
  it('allows the eleventh starter', async () => {
    tx.matchSquadPlayer.count.mockResolvedValue(10);
    await expect(service.create(candidate)).resolves.toEqual(candidate);
    expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
  });
  it('allows substitutes with eleven starters', async () => {
    await service.create({ ...candidate, role: 'SUBSTITUTE' });
    expect(tx.matchSquadPlayer.count).not.toHaveBeenCalled();
  });
  it('rejects promotion of a substitute when eleven starters exist', async () => {
    tx.matchSquadPlayer.findUnique.mockResolvedValue({ ...candidate, role: 'SUBSTITUTE', match: { status: 'PRE_MATCH' } });
    await expect(service.update(1, { role: 'STARTER' })).rejects.toThrow('at most 11');
    expect(tx.matchSquadPlayer.update).not.toHaveBeenCalled();
  });
  it('allows retaining or demoting an existing starter', async () => {
    tx.matchSquadPlayer.findUnique.mockResolvedValue({ ...candidate, match: { status: 'PRE_MATCH' } });
    await service.update(1, { role: 'STARTER' });
    await service.update(1, { role: 'SUBSTITUTE' });
    expect(tx.matchSquadPlayer.count).not.toHaveBeenCalled();
  });
  it('retries a serialization conflict and rechecks capacity', async () => {
    db.$transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('conflict', { code: 'P2034', clientVersion: '7.10.1' }));
    await expect(service.create(candidate)).rejects.toThrow('at most 11');
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
  it('retries the PostgreSQL adapter conflict raised during commit and rechecks capacity', async () => {
    const conflict = Object.assign(new Error('TransactionWriteConflict'), {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
    });
    db.$transaction.mockRejectedValueOnce(conflict);
    await expect(service.create(candidate)).rejects.toThrow('at most 11');
    expect(db.$transaction).toHaveBeenCalledTimes(2);
  });
  it('returns a conflict after three adapter conflicts', async () => {
    db.$transaction.mockRejectedValue(Object.assign(new Error('TransactionWriteConflict'), {
      name: 'DriverAdapterError',
      cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
    }));
    await expect(service.create(candidate)).rejects.toThrow('Concurrent squad update');
    expect(db.$transaction).toHaveBeenCalledTimes(3);
  });
});
