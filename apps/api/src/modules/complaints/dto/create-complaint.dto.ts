import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsUrl } from 'class-validator';

export class CreateComplaintDto {
  @IsString() @IsNotEmpty()
  orderId: string;

  @IsString() @IsNotEmpty()
  reason: string;

  @IsString() @IsNotEmpty()
  description: string;

  @IsOptional() @IsNumber()
  requestedAmount?: number;

  @IsOptional() @IsArray() @IsUrl({}, { each: true })
  customerPhotos?: string[];
}
