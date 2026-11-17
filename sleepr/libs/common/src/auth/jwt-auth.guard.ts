import {CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException} from '@nestjs/common';
import {catchError, map, Observable, of, tap} from 'rxjs';
import {AUTH_SERVICE} from '../constants/services.js';
import {ClientProxy} from '@nestjs/microservices';
import {UserDto} from '@app/common';
import {Reflector} from '@nestjs/core';
import {PinoLogger} from 'nestjs-pino';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
        private readonly reflector: Reflector,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(JwtAuthGuard.name);
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const jwt =
            request.cookies?.Authentication ||
            request.headers.authorization?.replace(/^Bearer\s+/i, '');

        if (!jwt) {
            return false;
        }

        const roles = this.reflector.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
            context.getClass(),
        ]);

        return this.authClient.send<UserDto>('authenticate', {
            Authentication: jwt
        }).pipe(
            tap((res) => {
                if (roles) {
                    for (const role of roles) {
                        if (!res.roles?.includes(role)) {
                            this.logger.error("The user does not have valid roles");
                            throw new UnauthorizedException();
                        }
                    }
                }

                context.switchToHttp().getRequest().user = res;
            }),
            map(() => true),
            catchError((error) => {
                this.logger.error({err: error}, 'Authentication failed');
                return of(false);
            })
        );
    }
}
