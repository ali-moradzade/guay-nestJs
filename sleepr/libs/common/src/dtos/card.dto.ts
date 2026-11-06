import {IsCreditCard, IsNotEmpty, IsNumber, IsString} from 'class-validator';
import {CardMessage} from '@app/common/types/index.js';

export class CardDto implements CardMessage{
    @IsString()
    @IsNotEmpty()
    cvc: string;

    @IsNumber()
    expMonth: number;

    @IsNumber()
    expYear: number;

    @IsCreditCard()
    number: string;
}
