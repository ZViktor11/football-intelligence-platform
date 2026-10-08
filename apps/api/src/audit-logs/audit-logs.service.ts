import { Injectable } from '@nestjs/common';
import {
  AuditAction,
  Prisma,
} from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type AuditClient = Pick<
  Prisma.TransactionClient,
  'auditLog'
>;

interface CreateAuditLogInput {
  action: AuditAction;
  entityType: string;
  entityId: number;
  userId: number;
  matchId: number;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: CreateAuditLogInput,
    client: AuditClient = this.prisma,
  ) {
    return client.auditLog.create({
      data: {
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        userId: data.userId,
        matchId: data.matchId,
        ...(data.before !== undefined
          ? { before: data.before }
          : {}),
        ...(data.after !== undefined
          ? { after: data.after }
          : {}),
      },
    });
  }

  async findByMatch(matchId: number) {
    return this.prisma.auditLog.findMany({
      where: { matchId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
}