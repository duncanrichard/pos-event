<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE event_carts
            DROP CONSTRAINT IF EXISTS event_carts_status_check
        ");

        DB::statement("
            ALTER TABLE event_carts
            ADD CONSTRAINT event_carts_status_check
            CHECK (status IN ('Draft', 'Paid', 'Void', 'Void Carts', 'Void Transaksi'))
        ");

        DB::statement("
            ALTER TABLE event_payment
            DROP CONSTRAINT IF EXISTS event_payment_payment_status_check
        ");

        DB::statement("
            ALTER TABLE event_payment
            ADD CONSTRAINT event_payment_payment_status_check
            CHECK (payment_status IN ('Draft', 'Paid', 'Void', 'Void Carts', 'Void Transaksi'))
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE event_carts
            DROP CONSTRAINT IF EXISTS event_carts_status_check
        ");

        DB::statement("
            ALTER TABLE event_carts
            ADD CONSTRAINT event_carts_status_check
            CHECK (status IN ('Draft', 'Paid', 'Void'))
        ");

        DB::statement("
            ALTER TABLE event_payment
            DROP CONSTRAINT IF EXISTS event_payment_payment_status_check
        ");

        DB::statement("
            ALTER TABLE event_payment
            ADD CONSTRAINT event_payment_payment_status_check
            CHECK (payment_status IN ('Draft', 'Paid', 'Void'))
        ");
    }
};