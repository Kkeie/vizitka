"use strict";
// Заглушка для Prisma Client, когда движки недоступны
// В production будет использоваться реальный Prisma Client
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
class PrismaClientStub {
    constructor() {
        // Заглушки для моделей
        this.user = {
            findUnique: () => Promise.resolve(null),
            create: () => Promise.resolve(null),
            findMany: () => Promise.resolve([]),
        };
        this.profile = {
            findUnique: () => Promise.resolve(null),
            create: () => Promise.resolve(null),
            update: () => Promise.resolve(null),
        };
        this.block = {
            findMany: () => Promise.resolve([]),
            create: () => Promise.resolve(null),
            update: () => Promise.resolve(null),
            delete: () => Promise.resolve(null),
            reorder: () => Promise.resolve([]),
        };
        this.$transaction = (operations) => Promise.resolve([]);
        // Stub implementation
    }
    $connect() {
        return Promise.resolve();
    }
    $disconnect() {
        return Promise.resolve();
    }
}
// Попробуем импортировать реальный Prisma Client, если он доступен
let PrismaClient;
try {
    PrismaClient = require("@prisma/client").PrismaClient;
}
catch {
    PrismaClient = PrismaClientStub;
}
exports.prisma = new PrismaClient();
process.on("beforeExit", async () => {
    if (exports.prisma && typeof exports.prisma.$disconnect === "function") {
        await exports.prisma.$disconnect();
    }
});
