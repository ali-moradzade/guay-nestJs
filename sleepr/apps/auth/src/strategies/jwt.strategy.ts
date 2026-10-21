import {Injectable} from '@nestjs/common';
import {PassportStrategy} from '@nestjs/passport';
import {ExtractJwt, Strategy} from 'passport-jwt';
import {ConfigService} from '@nestjs/config';
import {UsersService} from '../users/users.service.js';
import {TokenPayload} from '../interfaces/token-payload.interface.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request: any) => request?.cookies?.Authentication || request?.Authentication,
            ]),
            secretOrKey: configService.getOrThrow('JWT_SECRET'),
        });
    }

    async validate({userId}: TokenPayload) {
        return this.usersService.getUser({_id: userId});
    }
}
