<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payment extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'payments';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'payment',
        'nama_payment',
        'name',
        'code',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function eventPayments()
    {
        return $this->hasMany(EventPayment::class, 'payment_id');
    }

    public function getDisplayNameAttribute(): string
    {
        return $this->payment
            ?? $this->nama_payment
            ?? $this->name
            ?? $this->code
            ?? 'Metode Pembayaran';
    }
}