import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub?: string;
  userId?: string;
  id?: string;
  phone?: string;
  role?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'secret',
    });
  }

  async validate(payload: JwtPayload) {
    const id = payload.sub ?? payload.userId ?? payload.id;

    if (!id) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      id,
      userId: id,
      phone: payload.phone ?? null,
      role: payload.role ?? null,
    };
  }
}