import { IsUUID, IsNumber, IsOptional, IsString } from 'class-validator';

export class ConfirmAppointmentDto {
  @IsUUID()
  patientId: string;

  @IsNumber()
  doctorId: number;

  @IsOptional()
  @IsNumber()
  slotId?: number; // ✅ slotId should be number (wave scheduling)

  @IsOptional()
  @IsString()
  date?: string; // 📅 YYYY-MM-DD

  @IsOptional()
  @IsString()
  time?: string; // optional for stream scheduling
}
