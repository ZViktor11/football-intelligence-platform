import 'dotenv/config';
import { PrismaClient, Role } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const assignment = await prisma.roleAssignment.create({
    data: {
      userId: 6,
      role: Role.SYSTEM_ADMIN,
    },
  });

  console.log(assignment);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });