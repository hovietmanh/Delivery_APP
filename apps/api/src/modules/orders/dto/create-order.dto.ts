import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceType, GoodsType, WeightRange, PaymentMethod } from '@prisma/client';

export class CreateOrderDto {
  @ApiProperty() @IsString() @IsNotEmpty() fromCity: string;
  @ApiProperty() @IsString() @IsNotEmpty() fromStation: string;
  @ApiProperty() @IsString() @IsNotEmpty() toCity: string;
  @ApiProperty() @IsString() @IsNotEmpty() toStation: string;

  @ApiPropertyOptional() @IsOptional() @IsString() tripId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedCompanyName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignedDriverId?: string;

  @ApiProperty({ enum: ServiceType }) @IsEnum(ServiceType) serviceType: ServiceType;
  @ApiProperty({ enum: GoodsType })  @IsEnum(GoodsType)   goodsType: GoodsType;
  @ApiProperty({ enum: WeightRange }) @IsEnum(WeightRange) weightRange: WeightRange;

  @ApiPropertyOptional() @IsOptional() @IsString() goodsDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) goodsValue?: number;

  @ApiProperty() @IsString() @IsNotEmpty() senderName: string;
  @ApiProperty() @IsString() @IsNotEmpty() senderPhone: string;
  @ApiPropertyOptional() @IsOptional() @IsString() senderAddress?: string;

  @ApiProperty() @IsString() @IsNotEmpty() receiverName: string;
  @ApiProperty() @IsString() @IsNotEmpty() receiverPhone: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiverAddress?: string;

  @ApiProperty() @IsNumber() @Min(0) shippingFee: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) doorPickupFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) doorDeliveryFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) insuranceFee?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() voucherId?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) discount?: number;
  @ApiProperty() @IsNumber() @Min(0) total: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) codAmount?: number;

  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;

  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}
