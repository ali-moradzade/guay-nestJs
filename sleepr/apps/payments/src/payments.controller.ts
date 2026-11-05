import {Controller, UsePipes, ValidationPipe} from '@nestjs/common';
import {PaymentsService} from './payments.service.js';
import {Ctx, MessagePattern, Payload, RmqContext} from '@nestjs/microservices';
import {PaymentsCreateChargeDto} from './dtos/payments-create-charge.dto.js';
import {CreateCheckoutSessionDto} from '@app/common';

@Controller()
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {
    }

    @MessagePattern('create_charge')
    @UsePipes(new ValidationPipe())
    async createCharge(
        @Payload() data: PaymentsCreateChargeDto,
        @Ctx() context: RmqContext,
    ) {
        const channel = context.getChannelRef();
        const originalMessage = context.getMessage();

        channel.ack(originalMessage);

        return this.paymentsService.createCharge(data);
    }

    @MessagePattern('create_checkout_session')
    @UsePipes(new ValidationPipe())
    async createCheckoutSession(
        @Payload() data: CreateCheckoutSessionDto,
    ) {
        return this.paymentsService.createCheckoutSession(data);
    }
}
