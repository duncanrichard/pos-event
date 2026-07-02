<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventPayment extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'event_payment';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'event_carts_id',
        'payment_id',
        'cashier_user_id',

        // Tambahan untuk PO DP / Lunas
        'payment_type',
        'dp_amount',
        'remaining_amount',

        // Field pembayaran utama
        'total_amount',
        'paid_amount',
        'change_amount',
        'payment_status',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'paid_amount' => 'decimal:2',
        'dp_amount' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'remaining_amount' => 'decimal:2',
    ];

    public function cart()
    {
        return $this->belongsTo(EventCart::class, 'event_carts_id');
    }

    public function payment()
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function cashier()
    {
        return $this->belongsTo(User::class, 'cashier_user_id');
    }
}