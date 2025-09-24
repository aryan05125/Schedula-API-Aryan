import { IsString, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSlotDto {
  @IsNotEmpty()
  doctorId: number;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsInt()
  capacity: number;

  @IsString()
  date: string;

  @IsOptional()
  @IsString()
  type?: string;
}
