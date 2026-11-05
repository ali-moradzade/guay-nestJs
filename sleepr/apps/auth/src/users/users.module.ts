import {Module} from '@nestjs/common';
import {UsersController} from './users.controller.js';
import {UsersService} from './users.service.js';
import {DatabaseModule, Role, User} from '@app/common';
import {UsersRepository} from './users.repository.js';

@Module({
    imports: [
        DatabaseModule,
        DatabaseModule.forFeature([
            User, Role,
        ])
    ],
    controllers: [UsersController],
    providers: [
        UsersService,
        UsersRepository,
    ],
    exports: [
        UsersService,
    ]
})
export class UsersModule {
}
