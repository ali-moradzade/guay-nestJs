import {Controller, UsePipes, ValidationPipe} from '@nestjs/common';
import {PaymentsService} from './payments.service.js';
import {MessagePattern, Payload} from '@nestjs/microservices';
import {PaymentsCreateChargeDto} from './dtos/payments-create-charge.dto.js';

@Controller()
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {
    }

    @MessagePattern('create_charge')
    @UsePipes(new ValidationPipe())
    async createCharge(
        @Payload() data: PaymentsCreateChargeDto,
    ) {
        return this.paymentsService.createCharge(data);
    }
}
