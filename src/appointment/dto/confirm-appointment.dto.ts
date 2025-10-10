import { IsUUID, IsNumber, IsOptional, IsString } from 'class-validator';
export class ConfirmAppointmentDto {
  @IsUUID()
  patientId: string;
  @IsNumber()
  doctorId: number;

  @IsOptional()
  @IsNumber()
  slotId?: number; // ✅ for wave scheduling (optional)

  @IsOptional()
  @IsString()
  date?: string; // 📅 YYYY-MM-DD

  @IsOptional()
  @IsString()
  reportingTime?: string; // ⏰ optional custom reporting time
}