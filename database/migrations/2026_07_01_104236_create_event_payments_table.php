<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_payment', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('event_carts_id')
                ->constrained('event_carts')
                ->cascadeOnDelete();

            $table->foreignUuid('payment_id')
                ->nullable()
                ->constrained('payments')
                ->nullOnDelete();

            $table->foreignUuid('cashier_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->decimal('total_amount', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('change_amount', 15, 2)->default(0);

            $table->enum('payment_status', [
                'Draft',
                'Paid',
                'Void',
            ])->default('Draft');

            $table->timestamps();
            $table->softDeletes();

            $table->index('event_carts_id');
            $table->index('payment_id');
            $table->index('cashier_user_id');
            $table->index('payment_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_payment');
    }
};