<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProdukPrice extends Model
{
    use HasUuids, SoftDeletes;

    protected $table = 'produk_price';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'produk_id',
        'harga_produk',
        'event_id',
    ];

    protected $casts = [
        'harga_produk' => 'decimal:2',
    ];

    public function produk()
    {
        return $this->belongsTo(Produk::class, 'produk_id');
    }

    public function event()
    {
        return $this->belongsTo(DataEvent::class, 'event_id');
    }
}