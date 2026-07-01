<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EventInbound extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'event_inbound';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'supplier_id',
        'event_id',
        'produk_price_id',
        'jumlah_produk',
        'tanggal_inbound',
    ];

    protected $casts = [
        'jumlah_produk' => 'integer',
        'tanggal_inbound' => 'date:Y-m-d',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function event()
    {
        return $this->belongsTo(DataEvent::class, 'event_id');
    }

    public function produkPrice()
    {
        return $this->belongsTo(ProdukPrice::class, 'produk_price_id');
    }
}