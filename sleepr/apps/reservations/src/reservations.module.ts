import {Module} from '@nestjs/common';
import {ReservationsService} from './reservations.service.js';
import {ReservationsController} from './reservations.controller.js';
import {DatabaseModule} from '@app/common';
import {ReservationRepository} from './reservation.repository.js';
import {ReservationDocument, ReservationSchema} from './models/reservation.schema.js';
import {LoggerModule} from '@app/common';

@Module({
    imports: [
        DatabaseModule,
        DatabaseModule.forFeature([
            {name: ReservationDocument.name, schema: ReservationSchema}
        ]),
        LoggerModule,
    ],
    controllers: [ReservationsController],
    providers: [
        ReservationsService,
        ReservationRepository,
    ],
})
export class ReservationsModule {
}
