import { PrismaService } from '../prisma/prisma.service';
export declare class HealthController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getHealth(): Promise<{
        ok: boolean;
        db: string;
        timestamp: string;
    }>;
}
