import {CanActivate, ExecutionContext, Injectable, NotFoundException,} from '@nestjs/common';
import {RpcException} from '@nestjs/microservices';
import {JwtService} from '@nestjs/jwt';
import {UsersService} from '../users/users.service.js';
import {TokenPayload} from '../interfaces/token-payload.interface.js';

@Injectable()
export class RpcJwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly usersService: UsersService,
    ) {
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const data = context.switchToRpc().getData<{
            Authentication?: string;
            user?: any;
        }>();

        const token = data?.Authentication;

        if (!token) {
            throw new RpcException({
                status: 401,
                message: 'Authentication required',
            });
        }

        let payload: TokenPayload;

        try {
            payload = await this.jwtService.verifyAsync<TokenPayload>(token);
        } catch {
            throw new RpcException({
                status: 401,
                message: 'Invalid authentication credentials',
            });
        }

        try {
            data.user = await this.usersService.getUser({
                _id: payload.userId,
            });

            return true;
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw new RpcException({
                    status: 401,
                    message: 'Invalid authentication credentials',
                });
            }

            throw error;
        }
    }
}

