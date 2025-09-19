import { IsEmail, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class RequestOtpDto {
  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;
}
