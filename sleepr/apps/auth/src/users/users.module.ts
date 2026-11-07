import {Module} from '@nestjs/common';
import {UsersController} from './users.controller.js';
import {UsersService} from './users.service.js';
import {UserDocument, UserSchema, DatabaseModule} from '@app/common';
import {UsersRepository} from './users.repository.js';
import {UsersResolver} from './users.resolver.js';

@Module({
    imports: [
        DatabaseModule,
        DatabaseModule.forFeature([
            {
                name: UserDocument.name,
                schema: UserSchema,
            }
        ])
    ],
    controllers: [UsersController],
    providers: [
        UsersService,
        UsersRepository,
        UsersResolver,
    ],
    exports: [
        UsersService,
    ]
})
export class UsersModule {
}
