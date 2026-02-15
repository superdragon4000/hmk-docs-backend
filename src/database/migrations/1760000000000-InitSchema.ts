import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1760000000000 implements MigrationInterface {
  name = 'InitSchema1760000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "public"."payments_provider_enum" AS ENUM('YOOKASSA')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_plan_enum" AS ENUM('DAY', 'WEEK')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'SUCCEEDED', 'CANCELED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_plan_enum" AS ENUM('DAY', 'WEEK')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_status_enum" AS ENUM('ACTIVE', 'EXPIRED')`,
    );

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying NOT NULL,
        "password_hash" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "catalogs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying NOT NULL,
        "description" character varying NOT NULL DEFAULT '',
        "file_path" character varying NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_0f8f77f3670f30595f9ec9db8f5" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider" "public"."payments_provider_enum" NOT NULL DEFAULT 'YOOKASSA',
        "provider_payment_id" character varying,
        "idempotence_key" character varying NOT NULL,
        "plan" "public"."payments_plan_enum" NOT NULL,
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "amount" numeric(10,2) NOT NULL,
        "currency" character varying NOT NULL DEFAULT 'RUB',
        "confirmation_url" character varying,
        "raw_payload" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_1867b9c52e4b72fce52f2f19f8d" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_0f1ff8a3d2d4f2ad5cb6ca15956" UNIQUE ("provider_payment_id"),
        CONSTRAINT "UQ_5f46cb6307f393afda20c8f1371" UNIQUE ("idempotence_key")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "plan" "public"."subscriptions_plan_enum" NOT NULL,
        "status" "public"."subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "starts_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "ends_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "payment_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked_at" TIMESTAMP WITH TIME ZONE,
        "user_agent" character varying,
        "ip" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" uuid NOT NULL,
        CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "payments" ADD CONSTRAINT "FK_748f4abf58acbf45b6816e7b63b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_a8724b7e47f99bb0cb1b37b742f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_317f3ac878eb591be724ec470f6" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_36d4e3f429f2730b6a6a9286a2a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_36d4e3f429f2730b6a6a9286a2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_317f3ac878eb591be724ec470f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_a8724b7e47f99bb0cb1b37b742f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "payments" DROP CONSTRAINT "FK_748f4abf58acbf45b6816e7b63b"`,
    );

    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "subscriptions"`);
    await queryRunner.query(`DROP TABLE "payments"`);
    await queryRunner.query(`DROP TABLE "catalogs"`);
    await queryRunner.query(`DROP TABLE "users"`);

    await queryRunner.query(`DROP TYPE "public"."subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."subscriptions_plan_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_plan_enum"`);
    await queryRunner.query(`DROP TYPE "public"."payments_provider_enum"`);
  }
}
