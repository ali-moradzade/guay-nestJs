import {ExecutionContext, NotFoundException,} from '@nestjs/common';
import {Test, TestingModule} from '@nestjs/testing';
import {JwtModule, JwtService} from '@nestjs/jwt';
import {RpcException} from '@nestjs/microservices';
import {UsersService} from '../users/users.service.js';
import {RpcJwtAuthGuard} from './rpc-jwt-auth.guard.js';
import {Types} from 'mongoose';

describe('RpcJwtAuthGuard', () => {
    let guard: RpcJwtAuthGuard;
    let jwtService: JwtService;
    let usersService: {
        getUser: ReturnType<typeof vi.fn>;
    };
    let module: TestingModule;

    const JWT_SECRET = 'test-secret';

    const user = {
        _id: new Types.ObjectId().toHexString(),
        email: 'test@example.com',
    };

    beforeAll(async () => {
        usersService = {
            getUser: vi.fn(),
        };

        module = await Test.createTestingModule({
            imports: [
                JwtModule.register({
                    secret: JWT_SECRET,
                    signOptions: {
                        expiresIn: '1h',
                    },
                }),
            ],
            providers: [
                RpcJwtAuthGuard,
                {
                    provide: UsersService,
                    useValue: usersService,
                },
            ],
        }).compile();

        guard = module.get(RpcJwtAuthGuard);
        jwtService = module.get(JwtService);
    });

    afterAll(async () => {
        await module?.close();
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createRpcContext = (data: any): ExecutionContext => {
        return {
            switchToRpc: () => ({
                getData: () => data,
            }),
        } as ExecutionContext;
    };

    const getRpcException = async (promise: Promise<boolean>) => {
        const error = await promise.catch((error) => error);

        expect(error).toBeInstanceOf(RpcException);

        return (error as RpcException).getError();
    };

    describe('canActivate', () => {
        it('should authenticate a user with a valid JWT', async () => {
            const token = await jwtService.signAsync({
                userId: user._id,
            });

            const data: {
                Authentication?: string;
                user?: any;
            } = {
                Authentication: token,
            };

            usersService.getUser.mockResolvedValue(user);

            const result = await guard.canActivate(
                createRpcContext(data),
            );

            expect(result).toBe(true);
            expect(usersService.getUser).toHaveBeenCalledWith({
                _id: user._id,
            });
            expect(data.user).toEqual(user);
        });

        it('should throw an RpcException when the token is missing', async () => {
            const error = await getRpcException(
                guard.canActivate(createRpcContext({})),
            );

            expect(error).toEqual({
                status: 401,
                message: 'Authentication required',
            });

            expect(usersService.getUser).not.toHaveBeenCalled();
        });

        it('should reject an invalid JWT', async () => {
            const error = await getRpcException(
                guard.canActivate(
                    createRpcContext({
                        Authentication: 'invalid-token',
                    }),
                ),
            );

            expect(error).toEqual({
                status: 401,
                message: 'Invalid authentication credentials',
            });

            expect(usersService.getUser).not.toHaveBeenCalled();
        });

        it('should reject an expired JWT', async () => {
            const token = await jwtService.signAsync(
                {
                    userId: user._id,
                },
                {
                    expiresIn: '-1s',
                },
            );

            const error = await getRpcException(
                guard.canActivate(
                    createRpcContext({
                        Authentication: token,
                    }),
                ),
            );

            expect(error).toEqual({
                status: 401,
                message: 'Invalid authentication credentials',
            });

            expect(usersService.getUser).not.toHaveBeenCalled();
        });

        it('should reject a valid JWT when the user does not exist', async () => {
            const token = await jwtService.signAsync({
                userId: user._id,
            });

            usersService.getUser.mockRejectedValue(
                new NotFoundException('Document was not found'),
            );

            const error = await getRpcException(
                guard.canActivate(
                    createRpcContext({
                        Authentication: token,
                    }),
                ),
            );

            expect(error).toEqual({
                status: 401,
                message: 'Invalid authentication credentials',
            });
        });

        it('should propagate unexpected errors from UsersService', async () => {
            const token = await jwtService.signAsync({
                userId: user._id,
            });

            const databaseError = new Error('Database connection failed');

            usersService.getUser.mockRejectedValue(databaseError);

            await expect(
                guard.canActivate(
                    createRpcContext({
                        Authentication: token,
                    }),
                ),
            ).rejects.toBe(databaseError);
        });
    });
});

