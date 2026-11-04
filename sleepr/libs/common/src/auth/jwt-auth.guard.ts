import {CanActivate, ExecutionContext, Inject, Injectable} from '@nestjs/common';
import {catchError, map, Observable, of, tap} from 'rxjs';
import {AUTH_SERVICE} from '../constants/services.js';
import {ClientProxy} from '@nestjs/microservices';
import {UserDto} from '@app/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    ) {
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        const request = context.switchToHttp().getRequest();
        const jwt =
            request.cookies?.Authentication ||
            request.headers.authorization?.replace(/^Bearer\s+/i, '');

        if (!jwt) {
            return false;
        }

        return this.authClient.send<UserDto>('authenticate', {
            Authentication: jwt
        }).pipe(
            tap((res) => {
                context.switchToHttp().getRequest().user = res;
            }),
            map(() => true),
            catchError(() => of(false))
        );
    }
}
