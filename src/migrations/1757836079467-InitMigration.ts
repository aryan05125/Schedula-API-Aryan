import { MigrationInterface, QueryRunner } from "typeorm";

export class InitMigration1757836079467 implements MigrationInterface {
    name = 'InitMigration1757836079467'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctors" DROP CONSTRAINT "FK_653c27d1b10652eb0c7bbbc4427"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_3b760bf1c51d45a47fe2b64074b"`);
        await queryRunner.query(`ALTER TABLE "doctors" RENAME COLUMN "user_id" TO "name"`);
        await queryRunner.query(`ALTER TABLE "doctors" RENAME CONSTRAINT "UQ_653c27d1b10652eb0c7bbbc4427" TO "UQ_4437fc38d690917ca3279c7d421"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "password"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "isVerified"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "otp"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "otpExpiry"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "doctor_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "role"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "doctorId" integer`);
        await queryRunner.query(`ALTER TABLE "users" ADD "username" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP CONSTRAINT "UQ_4437fc38d690917ca3279c7d421"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "FK_c39435c71c0fff03449eb6b2332" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_c39435c71c0fff03449eb6b2332"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP COLUMN "name"`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD "name" integer`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "UQ_4437fc38d690917ca3279c7d421" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "username"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP COLUMN "doctorId"`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('doctor', 'patient', 'admin')`);
        await queryRunner.query(`ALTER TABLE "users" ADD "role" "public"."users_role_enum" NOT NULL DEFAULT 'patient'`);
        await queryRunner.query(`ALTER TABLE "users" ADD "email" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")`);
        await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "doctor_id" integer`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "otpExpiry" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "otp" character varying`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "isVerified" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "patients" ADD "password" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "doctors" RENAME CONSTRAINT "UQ_4437fc38d690917ca3279c7d421" TO "UQ_653c27d1b10652eb0c7bbbc4427"`);
        await queryRunner.query(`ALTER TABLE "doctors" RENAME COLUMN "name" TO "user_id"`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "FK_3b760bf1c51d45a47fe2b64074b" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "FK_653c27d1b10652eb0c7bbbc4427" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
