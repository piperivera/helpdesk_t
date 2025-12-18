import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        // importante: usar explícitamente DATABASE_URL
        url: process.env.DATABASE_URL,
      },
    },
  });

// Evita múltiples instancias en dev (Next + HMR)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
