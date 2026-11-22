import { Prisma } from '../../generated/prisma/client';

/** A serialization failure may escape the adapter directly during COMMIT. */
export function isTransactionWriteConflict(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === 'P2034';
  }
  if (!(error instanceof Error) || error.name !== 'DriverAdapterError') {
    return false;
  }
  const cause = error.cause;
  return typeof cause === 'object' && cause !== null &&
    'kind' in cause && cause.kind === 'TransactionWriteConflict';
}
