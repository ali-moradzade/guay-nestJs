import {Resolver, Mutation, Args, Query} from '@nestjs/graphql';
import {UserDocument} from '@app/common';
import {UsersService} from './users.service.js';
import {CreateUserDto} from './dto/create-user.dto.js';

@Resolver(() => UserDocument)
export class UsersResolver {
    constructor(
        private readonly usersService: UsersService,
    ) {
    }

    @Mutation(() => UserDocument)
    createUser(
        @Args('createUserInput') createUserInput: CreateUserDto,
    ) {
        return this.usersService.create(createUserInput);
    }

    @Query(() => [UserDocument], {name: 'users'})
    findAll() {
        return this.usersService.findAll()
    }
}
