<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventCartDetail extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'event_carts_detail';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'event_carts_id',
        'produk_price_id',
        'qty',
    ];

    protected $casts = [
        'qty' => 'integer',
    ];

    public function cart()
    {
        return $this->belongsTo(EventCart::class, 'event_carts_id');
    }

    public function produkPrice()
    {
        return $this->belongsTo(ProdukPrice::class, 'produk_price_id');
    }
}