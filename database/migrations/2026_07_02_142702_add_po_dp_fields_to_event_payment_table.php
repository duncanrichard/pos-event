<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /**
         * Nama tabel di database kamu terlihat memakai event_payment.
         * Kalau di project lain tabelnya event_payments, sesuaikan nama tabel ini.
         */
        Schema::table('event_payment', function (Blueprint $table) {
            if (!Schema::hasColumn('event_payment', 'payment_type')) {
                $table->string('payment_type', 30)
                    ->default('Lunas')
                    ->after('payment_id');
            }

            if (!Schema::hasColumn('event_payment', 'dp_amount')) {
                $table->decimal('dp_amount', 15, 2)
                    ->default(0)
                    ->after('paid_amount');
            }

            if (!Schema::hasColumn('event_payment', 'remaining_amount')) {
                $table->decimal('remaining_amount', 15, 2)
                    ->default(0)
                    ->after('change_amount');
            }
        });
    }

    public function down(): void
    {
        Schema::table('event_payment', function (Blueprint $table) {
            if (Schema::hasColumn('event_payment', 'remaining_amount')) {
                $table->dropColumn('remaining_amount');
            }

            if (Schema::hasColumn('event_payment', 'dp_amount')) {
                $table->dropColumn('dp_amount');
            }

            if (Schema::hasColumn('event_payment', 'payment_type')) {
                $table->dropColumn('payment_type');
            }
        });
    }
};