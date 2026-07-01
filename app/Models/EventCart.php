<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventCart extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'event_carts';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'event_id',
        'customer',
        'no_invoice',
        'tanggal_carts',
        'status',
    ];

    protected $casts = [
        'tanggal_carts' => 'date:Y-m-d',
    ];

    public function event()
    {
        return $this->belongsTo(DataEvent::class, 'event_id');
    }

    public function details()
    {
        return $this->hasMany(EventCartDetail::class, 'event_carts_id');
    }

    public function payment()
    {
        return $this->hasOne(EventPayment::class, 'event_carts_id');
    }
}