<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE event_payment
            DROP CONSTRAINT IF EXISTS event_payment_payment_status_check
        ");

        DB::statement("
            UPDATE event_payment
            SET payment_status = 'Lunas'
            WHERE payment_status IN ('Paid', 'paid', 'PAID')
        ");

        DB::statement("
            UPDATE event_payment
            SET payment_status = 'Belum Lunas'
            WHERE payment_status IN ('Pending', 'pending', 'DP', 'dp', 'Belum lunas', 'belum lunas')
        ");

        DB::statement("
            UPDATE event_payment
            SET payment_status = 'Void Transaksi'
            WHERE payment_status IN ('Void', 'void', 'VOID')
        ");

        DB::statement("
            UPDATE event_payment
            SET payment_status = 'Lunas'
            WHERE payment_status IS NULL OR TRIM(payment_status) = ''
        ");

        DB::statement("
            ALTER TABLE event_payment
            ADD CONSTRAINT event_payment_payment_status_check
            CHECK (
                payment_status IN (
                    'Lunas',
                    'Belum Lunas',
                    'Void Transaksi'
                )
            )
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE event_payment
            DROP CONSTRAINT IF EXISTS event_payment_payment_status_check
        ");

        DB::statement("
            ALTER TABLE event_payment
            ADD CONSTRAINT event_payment_payment_status_check
            CHECK (
                payment_status IN (
                    'Lunas',
                    'Belum Lunas'
                )
            )
        ");
    }
};