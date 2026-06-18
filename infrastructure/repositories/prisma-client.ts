import { Prisma, PrismaClient } from "@prisma/client";

export type PrismaRepositoryClient = PrismaClient | Prisma.TransactionClient;
