import { validateTimeline } from './match-timeline';

const squad = [
  { playerId: 1, role: 'STARTER' },
  { playerId: 2, role: 'STARTER' },
  { playerId: 3, role: 'SUBSTITUTE' },
];
const yellow = (id: number, minute: number) => ({ id, minute, type: 'YELLOW_CARD', playerId: 1 });
const goal = (id: number, minute: number, playerId = 1) => ({ id, minute, type: 'GOAL', playerId });
const sub = { id: 5, minute: 40, type: 'SUBSTITUTION', playerOutId: 2, playerInId: 3 };

describe('Chronological match history', () => {
  it('allows play after one yellow and before the second', () => {
    expect(() => validateTimeline(squad, [yellow(1, 10), yellow(3, 30), goal(2, 20)])).not.toThrow();
  });
  it('rejects a goal following a second yellow', () => {
    expect(() => validateTimeline(squad, [yellow(1, 10), yellow(2, 30), goal(3, 30)])).toThrow('Invalid event history');
  });
  it('uses event ID for equal-minute ordering', () => {
    expect(() => validateTimeline(squad, [yellow(1, 10), yellow(4, 30), goal(3, 30)])).not.toThrow();
  });
  it('restores eligibility after correcting one yellow', () => {
    expect(() => validateTimeline(squad, [yellow(2, 30), goal(3, 40)])).not.toThrow();
  });
  it('rejects a dismissal followed by an assist', () => {
    expect(() => validateTimeline(squad, [yellow(1, 10), yellow(2, 30), { ...goal(3, 45, 2), assistPlayerId: 1 }])).toThrow();
  });
  it('rejects replacing a sent-off player', () => {
    expect(() => validateTimeline(squad, [yellow(1, 10), yellow(2, 30), { ...sub, playerOutId: 1 }])).toThrow();
  });
  it('rejects sending a dismissed substitute onto the pitch', () => {
    expect(() => validateTimeline(squad, [{ id: 1, minute: 10, type: 'RED_CARD', playerId: 3 }, sub])).toThrow();
  });
  it('rejects deleting or moving a prerequisite substitution', () => {
    expect(() => validateTimeline(squad, [sub, goal(6, 45, 3)])).not.toThrow();
    expect(() => validateTimeline(squad, [goal(6, 45, 3)])).toThrow();
    expect(() => validateTimeline(squad, [{ ...sub, minute: 50 }, goal(6, 45, 3)])).toThrow();
  });
});
