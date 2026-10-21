import {Module} from '@nestjs/common';
import {UsersController} from './users.controller.js';
import {UsersService} from './users.service.js';
import {DatabaseModule} from '@app/common';
import {UserDocument, UserSchema} from './models/user.schema.js';
import {UsersRepository} from './users.repository.js';

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
    ],
    exports: [
        UsersService,
    ]
})
export class UsersModule {
}
