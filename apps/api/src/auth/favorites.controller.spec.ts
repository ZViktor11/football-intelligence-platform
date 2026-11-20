import type { Request } from 'express';
import { FavoritesController } from './favorites.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoritesController', () => {
  const favorite = {
    findMany: jest.fn().mockResolvedValue([]),
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
    deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
  };
  const controller = new FavoritesController({
    favorite,
  } as unknown as PrismaService);
  const request = (sub: number) =>
    ({ user: { sub } }) as unknown as Request & { user: { sub: number } };

  beforeEach(() => jest.clearAllMocks());

  it('lists only the signed-in user favorites', async () => {
    await controller.list(request(12));
    expect(favorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 12 } }),
    );
  });

  it.each(['team', 'player', 'competition', 'match'])(
    'supports idempotent %s favorites',
    async (type) => {
      await controller.add(request(12), type, 3);
      expect(favorite.createMany).toHaveBeenCalledWith({
        data: [{ userId: 12, [type + 'Id']: 3 }],
        skipDuplicates: true,
      });
    },
  );

  it('removes only the signed-in user favorite', async () => {
    await controller.remove(request(19), 'match', 3);
    expect(favorite.deleteMany).toHaveBeenCalledWith({
      where: { userId: 19, matchId: 3 },
    });
  });

  it.each(['unknown', 'constructor', '__proto__'])(
    'rejects an invalid kind %s',
    async (type) => {
      await expect(controller.add(request(12), type, 3)).rejects.toThrow(
        'Invalid favorite target',
      );
      expect(favorite.createMany).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid ID', async () => {
    await expect(controller.remove(request(12), 'match', 0)).rejects.toThrow(
      'Invalid favorite target',
    );
  });
});
