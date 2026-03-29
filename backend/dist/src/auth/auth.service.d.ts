import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
export declare class AuthService {
    private readonly usersService;
    private readonly jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    register(params: {
        name: string;
        phone: string;
        password: string;
        role?: 'ADMIN' | 'COURIER';
    }): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        accessToken: string;
    }>;
    login(phone: string, password: string): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        accessToken: string;
    }>;
}
