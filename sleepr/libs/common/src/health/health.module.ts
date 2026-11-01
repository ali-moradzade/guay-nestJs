import {Module} from '@nestjs/common';
import {HealthController} from '@app/common/health/health.controller.js';

@Module({
    controllers: [HealthController],
})
export class HealthModule {

}
