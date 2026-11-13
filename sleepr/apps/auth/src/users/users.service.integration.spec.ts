import {Test, TestingModule} from '@nestjs/testing';
import {ConfigModule} from '@nestjs/config';
import {getModelToken} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {afterAll, beforeAll, beforeEach, describe, expect, it,} from 'vitest';
import * as bcrypt from 'bcryptjs';
import {UsersModule} from './users.module.js';
import {UsersService} from './users.service.js';
// @ts-ignore
import {UserDocument} from '@app/common';
import {resolve} from 'node:path';

describe('UsersService (integration)', () => {
    let module: TestingModule;
    let usersService: UsersService;
    let userModel: Model<UserDocument>;

    beforeAll(async () => {
        module = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: resolve(process.cwd(), '.env.test'),
                    override: true,
                    validate: (config) => {
                        if (!config.MONGODB_URI?.includes('sleepr_test')) {
                            throw new Error(
                                'Integration tests must use the sleepr_test database',
                            );
                        }

                        return config;
                    },
                }),
                UsersModule,
            ],
        }).compile();

        usersService = module.get<UsersService>(UsersService);

        userModel = module.get<Model<UserDocument>>(
            getModelToken(UserDocument.name),
        );
    });

    beforeEach(async () => {
        await userModel.deleteMany({});
    });

    afterAll(async () => {
        await module?.close();
    });

    const createTestUser = async (
        email = 'integration@example.com',
        password = 'password123',
    ) => {
        return usersService.create({email, password});
    };

    describe('create', () => {
        it('should create a user and persist a hashed password', async () => {
            const createUserDto = {
                email: 'integration@example.com',
                password: 'password123',
            };

            const result = await usersService.create(createUserDto);

            expect(result.email).toBe(createUserDto.email);
            expect(result.password).not.toBe(createUserDto.password);

            expect(
                await bcrypt.compare(
                    createUserDto.password,
                    result.password,
                ),
            ).toBe(true);

            const persistedUser = await userModel
                .findOne({email: createUserDto.email})
                .exec();

            expect(persistedUser).not.toBeNull();
            expect(persistedUser?.email).toBe(createUserDto.email);
            expect(persistedUser?.password).toBe(result.password);
        });

        it('should reject creating a user with an existing email', async () => {
            const email = 'duplicate@example.com';

            await createTestUser(email);

            await expect(
                createTestUser(email),
            ).rejects.toThrow('Email already exists');

            const users = await userModel
                .find({email})
                .exec();

            expect(users).toHaveLength(1);
        });
    });

    describe('verifyUser', () => {
        it('should return the user when credentials are valid', async () => {
            const email = 'valid@example.com';
            const password = 'password123';

            const createdUser = await createTestUser(email, password);

            const result = await usersService.verifyUser(email, password);

            expect(result.email).toBe(createdUser.email);
            expect(result._id.toString()).toBe(
                createdUser._id.toString(),
            );
        });

        it('should reject an incorrect password', async () => {
            const email = 'wrong-password@example.com';

            await createTestUser(email, 'password123');

            await expect(
                usersService.verifyUser(email, 'wrong-password'),
            ).rejects.toThrow('Credentials are not valid');
        });

        it('should reject credentials when the user does not exist', async () => {
            await expect(
                usersService.verifyUser(
                    'nonexistent@example.com',
                    'password123',
                ),
            ).rejects.toThrow('Credentials are not valid');
        });
    });

    describe('getUser', () => {
        it('should return the requested user by _id', async () => {
            const createdUser = await createTestUser(
                'get-user@example.com',
            );

            const result = await usersService.getUser({
                _id: createdUser._id.toString(),
            });

            expect(result.email).toBe(createdUser.email);
            expect(result._id.toString()).toBe(
                createdUser._id.toString(),
            );
        });

        it('should throw NotFoundException when the user does not exist', async () => {
            const nonexistentId = '507f1f77bcf86cd799439011';

            await expect(
                usersService.getUser({
                    _id: nonexistentId,
                }),
            ).rejects.toThrow('Document was not found');
        });
    });

    describe('findAll', () => {
        it('should return an empty array when there are no users', async () => {
            const result = await usersService.findAll();

            expect(result).toEqual([]);
        });

        it('should return all existing users', async () => {
            await createTestUser('first@example.com');
            await createTestUser('second@example.com');
            await createTestUser('third@example.com');

            const result = await usersService.findAll();

            expect(result).toHaveLength(3);

            expect(result.map((user: any) => user.email)).toEqual(
                expect.arrayContaining([
                    'first@example.com',
                    'second@example.com',
                    'third@example.com',
                ]),
            );
        });
    });
});
