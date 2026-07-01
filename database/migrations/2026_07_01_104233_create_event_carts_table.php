<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_carts', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('event_id')
                ->constrained('data_event')
                ->cascadeOnDelete();

            $table->string('customer')->nullable();
            $table->string('no_invoice')->unique();
            $table->date('tanggal_carts');

            $table->enum('status', [
                'Draft',
                'Paid',
                'Void',
            ])->default('Draft');

            $table->timestamps();
            $table->softDeletes();

            $table->index('event_id');
            $table->index('tanggal_carts');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_carts');
    }
};