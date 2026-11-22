import { fairPlayPenalties } from './fair-play';

describe('Fair play penalties', () => {
  const card = (id: number, type: string, playerId: number | null, teamId = 1, staffMemberId: number | null = null) =>
    ({ id, type, playerId, teamId, staffMemberId });

  it('counts individual yellow, second-yellow and straight-red penalties', () => {
    expect(fairPlayPenalties([
      card(1, 'YELLOW_CARD', 1), card(2, 'YELLOW_CARD', 2),
      card(3, 'YELLOW_CARD', 2), card(4, 'RED_CARD', 3),
      card(5, 'YELLOW_CARD', 4), card(6, 'RED_CARD', 4),
    ]).get(1)).toBe(13);
  });
  it('does not double-count legacy explicit red after a second yellow', () => {
    expect(fairPlayPenalties([
      card(1, 'YELLOW_CARD', 1), card(2, 'YELLOW_CARD', 1), card(3, 'RED_CARD', 1),
    ]).get(1)).toBe(3);
  });
  it('keeps teams and staff separate and ignores goals', () => {
    expect([...fairPlayPenalties([
      card(1, 'YELLOW_CARD', 1), card(2, 'RED_CARD', null, 1, 1),
      card(3, 'YELLOW_CARD', 2, 2), card(4, 'GOAL', 2, 2),
    ])]).toEqual([[1, 5], [2, 1]]);
  });
});
