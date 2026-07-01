<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('event_carts', function (Blueprint $table) {
            if (!Schema::hasColumn('event_carts', 'transaction_type')) {
                $table->string('transaction_type', 20)
                    ->default('Pembelian')
                    ->after('status');
            }
        });

        DB::table('event_carts')
            ->whereNull('transaction_type')
            ->update([
                'transaction_type' => 'Pembelian',
            ]);

        DB::statement("
            ALTER TABLE event_carts
            DROP CONSTRAINT IF EXISTS event_carts_transaction_type_check
        ");

        DB::statement("
            ALTER TABLE event_carts
            ADD CONSTRAINT event_carts_transaction_type_check
            CHECK (transaction_type IN ('PO', 'Pembelian'))
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE event_carts
            DROP CONSTRAINT IF EXISTS event_carts_transaction_type_check
        ");

        Schema::table('event_carts', function (Blueprint $table) {
            if (Schema::hasColumn('event_carts', 'transaction_type')) {
                $table->dropColumn('transaction_type');
            }
        });
    }
};