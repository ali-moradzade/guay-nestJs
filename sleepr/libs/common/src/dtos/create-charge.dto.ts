import {CardDto} from './card.dto.js';
import {IsNotEmptyObject, IsNumber, IsOptional, IsPositive, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';
import {CreateChargeMessage} from '@app/common';

export class CreateChargeDto implements Omit<CreateChargeMessage, 'email' | 'card'>{
    @IsOptional()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => CardDto)
    card?: CardDto;

    @IsNumber({maxDecimalPlaces: 2})
    @IsPositive()
    amount: number;
}
