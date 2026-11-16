import {ServiceUnavailableException, UnauthorizedException} from '@nestjs/common';
import {app} from './app.js';
import {ClientProxy} from '@nestjs/microservices';
import {AUTH_SERVICE} from '@app/common';
import {lastValueFrom} from 'rxjs';

export const authContext = async ({req}: any) => {
    const token =
        req.cookies?.Authentication ??
        req.headers?.authentication ??
        req.headers?.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
        throw new UnauthorizedException('Authentication required');
    }

    try {
        const authClient = app.get<ClientProxy>(AUTH_SERVICE);
        const user = await lastValueFrom(
            authClient.send('authenticate', {
                Authentication: token,
            })
        );

        if (!user) {
            throw new UnauthorizedException('Invalid authentication credentials');
        }

        return {user};
    } catch (error) {
        if (error instanceof UnauthorizedException) {
            throw error;
        }

        if (
            typeof error === 'object' &&
            error !== null &&
            'status' in error &&
            error.status === 401
        ) {
            throw new UnauthorizedException(
                'Invalid authentication credentials',
            );
        }

        throw new ServiceUnavailableException(
            'Authentication service is unavailable',
        );
    }
};
