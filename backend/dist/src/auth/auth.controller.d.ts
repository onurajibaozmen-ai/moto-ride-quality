import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(body: RegisterDto): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        accessToken: string;
    }>;
    login(body: LoginDto): Promise<{
        user: {
            id: string;
            name: string;
            phone: string;
            role: import("@prisma/client").$Enums.UserRole;
        };
        accessToken: string;
    }>;
}
