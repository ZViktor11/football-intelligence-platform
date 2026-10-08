
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export enum StandingsTieBreaker {
  POINTS = 'POINTS',
  GOAL_DIFFERENCE = 'GOAL_DIFFERENCE',
  GOALS_FOR = 'GOALS_FOR',
  HEAD_TO_HEAD_POINTS = 'HEAD_TO_HEAD_POINTS',
  HEAD_TO_HEAD_GOAL_DIFFERENCE = 'HEAD_TO_HEAD_GOAL_DIFFERENCE',
  HEAD_TO_HEAD_GOALS_FOR = 'HEAD_TO_HEAD_GOALS_FOR',
  FAIR_PLAY = 'FAIR_PLAY',
  DRAWING_OF_LOTS = 'DRAWING_OF_LOTS',
}

export const DEFAULT_STANDINGS_TIEBREAKERS: StandingsTieBreaker[] = [
  StandingsTieBreaker.POINTS,
  StandingsTieBreaker.GOAL_DIFFERENCE,
  StandingsTieBreaker.GOALS_FOR,
  StandingsTieBreaker.HEAD_TO_HEAD_POINTS,
  StandingsTieBreaker.HEAD_TO_HEAD_GOAL_DIFFERENCE,
  StandingsTieBreaker.HEAD_TO_HEAD_GOALS_FOR,
  StandingsTieBreaker.FAIR_PLAY,
  StandingsTieBreaker.DRAWING_OF_LOTS,
];

export function isValidStandingsTieBreakers(
  value: unknown,
): value is StandingsTieBreaker[] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }

  const validRules = new Set<string>(
    Object.values(StandingsTieBreaker),
  );

  if (
    !value.every(
      (rule): rule is StandingsTieBreaker =>
        typeof rule === 'string' && validRules.has(rule),
    )
  ) {
    return false;
  }

  if (new Set(value).size !== value.length) {
    return false;
  }

  // Points must always be the first ranking criterion.
  if (value[0] !== StandingsTieBreaker.POINTS) {
    return false;
  }

  // Drawing of lots is only meaningful as the final criterion.
  const drawingIndex = value.indexOf(
    StandingsTieBreaker.DRAWING_OF_LOTS,
  );

  if (
    drawingIndex !== -1 &&
    drawingIndex !== value.length - 1
  ) {
    return false;
  }

  return true;
}

export function IsStandingsTieBreakers(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (target: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isStandingsTieBreakers',
      target: target.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return isValidStandingsTieBreakers(value);
        },
        defaultMessage(args: ValidationArguments) {
          return (
            `${args.property} must be a non-empty array of unique ` +
            'supported rules, starting with POINTS, with ' +
            'DRAWING_OF_LOTS only at the end'
          );
        },
      },
    });
  };
}
