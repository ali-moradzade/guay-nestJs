import {INestApplication, ServiceUnavailableException, UnauthorizedException,} from '@nestjs/common';
import {of, throwError} from 'rxjs';
import {authContext} from './auth.context.js';
import {setApp} from './app.js';
import {beforeEach, describe, expect, it, vi,} from 'vitest';
import {Types} from 'mongoose';
import {AUTH_SERVICE} from '@app/common';

describe('authContext', () => {
    let authClient: {
        send: ReturnType<typeof vi.fn>;
    };

    let nestApp: {
        get: ReturnType<typeof vi.fn>;
    };

    const user = {
        _id: new Types.ObjectId().toHexString(),
        email: 'test@example.com',
    };

    const token = 'valid-jwt-token';

    beforeEach(() => {
        authClient = {
            send: vi.fn(),
        };

        nestApp = {
            get: vi.fn().mockReturnValue(authClient),
        };

        setApp(nestApp as unknown as INestApplication);
    });

    describe('token extraction', () => {
        it('should extract the token from the Authentication header', async () => {
            authClient.send.mockReturnValue(of(user));

            const result = await authContext({
                req: {
                    headers: {
                        authentication: token,
                    },
                },
            });

            expect(result).toEqual({user});

            expect(nestApp.get).toHaveBeenCalledWith(AUTH_SERVICE);

            expect(authClient.send).toHaveBeenCalledWith(
                'authenticate',
                {
                    Authentication: token,
                },
            );
        });

        it('should extract the token from the Authentication cookie', async () => {
            authClient.send.mockReturnValue(of(user));

            const result = await authContext({
                req: {
                    cookies: {
                        Authentication: token,
                    },
                    headers: {},
                },
            });

            expect(result).toEqual({user});

            expect(authClient.send).toHaveBeenCalledWith(
                'authenticate',
                {
                    Authentication: token,
                },
            );
        });

        it('should extract a Bearer token from the Authorization header', async () => {
            authClient.send.mockReturnValue(of(user));

            const result = await authContext({
                req: {
                    headers: {
                        authorization: `Bearer ${token}`,
                    },
                },
            });

            expect(result).toEqual({user});

            expect(authClient.send).toHaveBeenCalledWith(
                'authenticate',
                {
                    Authentication: token,
                },
            );
        });

        it('should prioritize the Authentication cookie over other sources', async () => {
            authClient.send.mockReturnValue(of(user));

            await authContext({
                req: {
                    cookies: {
                        Authentication: 'cookie-token',
                    },
                    headers: {
                        authentication: 'header-token',
                        authorization: 'Bearer bearer-token',
                    },
                },
            });

            expect(authClient.send).toHaveBeenCalledWith(
                'authenticate',
                {
                    Authentication: 'cookie-token',
                },
            );
        });
    });

    describe('authentication', () => {
        it('should throw UnauthorizedException when the token is missing', async () => {
            await expect(
                authContext({
                    req: {
                        headers: {},
                    },
                }),
            ).rejects.toThrow(
                new UnauthorizedException('Authentication required'),
            );

            expect(nestApp.get).not.toHaveBeenCalled();
            expect(authClient.send).not.toHaveBeenCalled();
        });

        it('should throw UnauthorizedException when the auth service returns no user', async () => {
            authClient.send.mockReturnValue(of(null));

            await expect(
                authContext({
                    req: {
                        headers: {
                            authentication: token,
                        },
                    },
                }),
            ).rejects.toThrow(
                new UnauthorizedException(
                    'Invalid authentication credentials',
                ),
            );
        });

        it('should throw UnauthorizedException when the auth service rejects authentication', async () => {
            authClient.send.mockReturnValue(
                throwError(() => ({
                    status: 401,
                    message: 'Invalid authentication credentials',
                })),
            );

            await expect(
                authContext({
                    req: {
                        headers: {
                            authentication: token,
                        },
                    },
                }),
            ).rejects.toThrow(UnauthorizedException);
        });

        it('should throw ServiceUnavailableException when the auth service is unavailable', async () => {
            authClient.send.mockReturnValue(
                throwError(() => new Error('Connection refused')),
            );

            await expect(
                authContext({
                    req: {
                        headers: {
                            authentication: token,
                        },
                    },
                }),
            ).rejects.toThrow(
                new ServiceUnavailableException(
                    'Authentication service is unavailable',
                ),
            );
        });
    });
});

