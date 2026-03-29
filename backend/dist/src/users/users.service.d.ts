import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByPhone(phone: string): import("@prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        phone: string;
        name: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastSeenAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findById(id: string): import("@prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        phone: string;
        name: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastSeenAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    createCourier(params: {
        name: string;
        phone: string;
        passwordHash: string;
        role?: UserRole;
    }): import("@prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        phone: string;
        name: string;
        passwordHash: string;
        role: import("@prisma/client").$Enums.UserRole;
        isActive: boolean;
        lastSeenAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/library").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
