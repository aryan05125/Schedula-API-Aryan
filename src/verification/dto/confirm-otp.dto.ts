import { IsEmail, IsNotEmpty, IsPhoneNumber } from 'class-validator';

export class ConfirmOtpDto {
  @IsEmail()
  email: string;

  @IsPhoneNumber()
  phone: string;

  @IsNotEmpty()
  otp: string;
}
