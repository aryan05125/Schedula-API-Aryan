// confirm-appointment.dto.ts
import { IsUUID, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfirmAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsNumber()
  doctorId: number;

  @IsOptional()
  @IsString()
  slotId?: string; // for wave scheduling

  @IsOptional()
  @IsString()
  time?: string; // optional for stream scheduling

  @IsOptional()
  @IsString()
  date?: string; // 📅 allow booking for specific date (YYYY-MM-DD)
  date?: string;    // 👈 new field for custom date (YYYY-MM-DD)

  @IsOptional()
  @IsString()
  time?: string;    // optional for stream scheduling
}
