import { IsUUID, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfirmAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsNumber()
  doctorId: number;

  @IsOptional()
  @IsString()
  slotId?: string;  // for wave scheduling

  @IsOptional()
  @IsString()
  time?: string;    // for stream scheduling
}
