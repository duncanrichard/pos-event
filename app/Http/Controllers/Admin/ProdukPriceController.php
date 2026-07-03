<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProdukPriceController extends Controller
{
    private string $produkPriceTable = 'produk_price';
    private string $bundleDetailTable = 'produk_price_details';
    private string $discountTable = 'produk_price_discounts';

    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 10);
        $perPage = $perPage > 0 ? $perPage : 10;

        $query = DB::table($this->produkPriceTable . ' as pp')
            ->leftJoin('produk as p', function ($join) {
                $join->on('p.id', '=', 'pp.produk_id')
                    ->whereNull('p.deleted_at');
            })
            ->leftJoin('data_event as de', function ($join) {
                $join->on('de.id', '=', 'pp.event_id')
                    ->whereNull('de.deleted_at');
            })
            ->whereNull('pp.deleted_at')
            ->select([
                'pp.id',
                'pp.produk_id',
                'pp.harga_produk',
                'pp.created_at',
                'pp.updated_at',
                'pp.deleted_at',
                'pp.event_id',
                'pp.tipe_harga',
                'pp.nama_bundle',

                'p.nama_produk',
                'p.product_number',
                'p.code_gs1',

                'de.nama_event',
                'de.alamat_event',
                'de.valid_from',
                'de.valid_until',
            ])
            ->when($search !== '', function ($q) use ($search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('p.nama_produk', 'like', '%' . $search . '%')
                        ->orWhere('p.product_number', 'like', '%' . $search . '%')
                        ->orWhere('p.code_gs1', 'like', '%' . $search . '%')
                        ->orWhere('pp.nama_bundle', 'like', '%' . $search . '%')
                        ->orWhere('de.nama_event', 'like', '%' . $search . '%')
                        ->orWhere('de.alamat_event', 'like', '%' . $search . '%');
                });
            })
            ->orderByDesc('pp.created_at');

        $paginator = $query->paginate($perPage);

        $rows = collect($paginator->items())->map(function ($row) {
            return $this->formatRow($row);
        })->values();

        return response()->json([
            'success' => true,
            'message' => 'Data produk price berhasil dimuat.',
            'data' => [
                'current_page' => $paginator->currentPage(),
                'data' => $rows,
                'first_page_url' => $paginator->url(1),
                'from' => $paginator->firstItem(),
                'last_page' => $paginator->lastPage(),
                'last_page_url' => $paginator->url($paginator->lastPage()),
                'links' => $paginator->linkCollection(),
                'next_page_url' => $paginator->nextPageUrl(),
                'path' => $paginator->path(),
                'per_page' => $paginator->perPage(),
                'prev_page_url' => $paginator->previousPageUrl(),
                'to' => $paginator->lastItem(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    public function options()
    {
        $produk = DB::table('produk')
            ->select([
                'id',
                'nama_produk',
                'product_number',
                'code_gs1',
            ])
            ->whereNull('deleted_at')
            ->orderBy('nama_produk')
            ->get();

        $events = DB::table('data_event')
            ->select([
                'id',
                'nama_event',
                'alamat_event',
                'valid_from',
                'valid_until',
            ])
            ->whereNull('deleted_at')
            ->orderByDesc('valid_from')
            ->orderBy('nama_event')
            ->get();

        return response()->json([
            'success' => true,
            'message' => 'Options berhasil dimuat.',
            'data' => [
                'produk' => $produk,
                'events' => $events,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $this->normalizeRequest($request);

        $validator = $this->validator($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        DB::beginTransaction();

        try {
            $id = (string) Str::uuid();

            DB::table($this->produkPriceTable)->insert([
                'id' => $id,
                'produk_id' => $validated['tipe_harga'] === 'single'
                    ? $validated['produk_id']
                    : null,
                'harga_produk' => $validated['harga_produk'],
                'event_id' => $validated['event_id'],
                'tipe_harga' => $validated['tipe_harga'],
                'nama_bundle' => $validated['tipe_harga'] === 'bundle'
                    ? $validated['nama_bundle']
                    : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($validated['tipe_harga'] === 'bundle') {
                $this->syncBundleDetails($id, $validated['items'] ?? []);
            }

            $this->syncDiscountTiers($id, $validated['discount_tiers'] ?? []);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Produk price berhasil ditambahkan.',
                'data' => $this->findDetail($id),
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menyimpan produk price.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function show(string $id)
    {
        $row = $this->findDetail($id);

        if (!$row) {
            return response()->json([
                'success' => false,
                'message' => 'Produk price tidak ditemukan.',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Detail produk price berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $this->normalizeRequest($request);

        $existing = DB::table($this->produkPriceTable)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$existing) {
            return response()->json([
                'success' => false,
                'message' => 'Produk price tidak ditemukan.',
            ], 404);
        }

        $validator = $this->validator($request);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validasi gagal.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();

        DB::beginTransaction();

        try {
            DB::table($this->produkPriceTable)
                ->where('id', $id)
                ->update([
                    'produk_id' => $validated['tipe_harga'] === 'single'
                        ? $validated['produk_id']
                        : null,
                    'harga_produk' => $validated['harga_produk'],
                    'event_id' => $validated['event_id'],
                    'tipe_harga' => $validated['tipe_harga'],
                    'nama_bundle' => $validated['tipe_harga'] === 'bundle'
                        ? $validated['nama_bundle']
                        : null,
                    'updated_at' => now(),
                ]);

            if ($validated['tipe_harga'] === 'bundle') {
                $this->syncBundleDetails($id, $validated['items'] ?? []);
            } else {
                DB::table($this->bundleDetailTable)
                    ->where('produk_price_id', $id)
                    ->whereNull('deleted_at')
                    ->update([
                        'deleted_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            $this->syncDiscountTiers($id, $validated['discount_tiers'] ?? []);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Produk price berhasil diperbarui.',
                'data' => $this->findDetail($id),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal memperbarui produk price.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    public function destroy(string $id)
    {
        $existing = DB::table($this->produkPriceTable)
            ->where('id', $id)
            ->whereNull('deleted_at')
            ->first();

        if (!$existing) {
            return response()->json([
                'success' => false,
                'message' => 'Produk price tidak ditemukan.',
            ], 404);
        }

        DB::beginTransaction();

        try {
            DB::table($this->bundleDetailTable)
                ->where('produk_price_id', $id)
                ->whereNull('deleted_at')
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table($this->discountTable)
                ->where('produk_price_id', $id)
                ->whereNull('deleted_at')
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table($this->produkPriceTable)
                ->where('id', $id)
                ->update([
                    'deleted_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Produk price berhasil dihapus.',
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            report($e);

            return response()->json([
                'success' => false,
                'message' => 'Gagal menghapus produk price.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 500);
        }
    }

    private function normalizeRequest(Request $request): void
    {
        $tipeHarga = $request->input('tipe_harga') === 'bundle' ? 'bundle' : 'single';

        if ($tipeHarga === 'single') {
            // Mode single tidak membutuhkan isi bundle. Ini mencegah validasi
            // "Isi bundle minimal 1 produk" muncul karena sisa state/form lama.
            $request->merge([
                'tipe_harga' => 'single',
                'nama_bundle' => null,
                'items' => [],
            ]);

            return;
        }

        $items = $request->input('items', []);

        if (!is_array($items)) {
            $items = [];
        }

        $request->merge([
            'tipe_harga' => 'bundle',
            'produk_id' => null,
            'items' => $items,
        ]);
    }

    private function validator(Request $request)
    {
        return Validator::make($request->all(), [
            'tipe_harga' => [
                'required',
                Rule::in(['single', 'bundle']),
            ],
            'event_id' => [
                'required',
                'uuid',
                Rule::exists('data_event', 'id')->whereNull('deleted_at'),
            ],
            'produk_id' => [
                'nullable',
                'required_if:tipe_harga,single',
                'uuid',
                Rule::exists('produk', 'id')->whereNull('deleted_at'),
            ],
            'nama_bundle' => [
                'nullable',
                'required_if:tipe_harga,bundle',
                'string',
                'max:255',
            ],
            'harga_produk' => [
                'required',
                'numeric',
                'min:0',
            ],
            'items' => [
                'nullable',
                'array',
            ],
            'items.*.produk_id' => [
                'nullable',
                'uuid',
                Rule::exists('produk', 'id')->whereNull('deleted_at'),
            ],
            'items.*.qty' => [
                'nullable',
                'integer',
                'min:1',
            ],
            'discount_tiers' => [
                'nullable',
                'array',
            ],
            'discount_tiers.*.min_qty' => [
                'required_with:discount_tiers',
                'integer',
                'min:1',
            ],
            'discount_tiers.*.max_qty' => [
                'nullable',
                'integer',
                'min:1',
            ],
            'discount_tiers.*.discount_type' => [
                'required_with:discount_tiers',
                Rule::in(['percent', 'nominal']),
            ],
            'discount_tiers.*.discount_value' => [
                'required_with:discount_tiers',
                'numeric',
                'min:0',
            ],
            'discount_tiers.*.is_active' => [
                'nullable',
                'boolean',
            ],
        ], [
            'tipe_harga.required' => 'Tipe harga wajib dipilih.',
            'tipe_harga.in' => 'Tipe harga tidak valid.',

            'event_id.required' => 'Event wajib dipilih.',
            'event_id.uuid' => 'Format event tidak valid.',
            'event_id.exists' => 'Event tidak ditemukan.',

            'produk_id.required_if' => 'Produk wajib dipilih untuk harga single.',
            'produk_id.uuid' => 'Format produk tidak valid.',
            'produk_id.exists' => 'Produk tidak ditemukan.',

            'nama_bundle.required_if' => 'Nama bundle wajib diisi.',
            'nama_bundle.max' => 'Nama bundle maksimal 255 karakter.',

            'harga_produk.required' => 'Harga wajib diisi.',
            'harga_produk.numeric' => 'Harga harus berupa angka.',
            'harga_produk.min' => 'Harga tidak boleh kurang dari 0.',

            'items.required_if' => 'Isi bundle wajib diisi.',
            'items.array' => 'Format isi bundle tidak valid.',
            'items.min' => 'Isi bundle minimal 1 produk.',

            'items.*.produk_id.required_if' => 'Produk bundle wajib dipilih.',
            'items.*.produk_id.uuid' => 'Format produk bundle tidak valid.',
            'items.*.produk_id.exists' => 'Produk bundle tidak ditemukan.',

            'items.*.qty.required_if' => 'Qty bundle wajib diisi.',
            'items.*.qty.integer' => 'Qty bundle harus angka bulat.',
            'items.*.qty.min' => 'Qty bundle minimal 1.',

            'discount_tiers.array' => 'Format diskon bertingkat tidak valid.',
            'discount_tiers.*.min_qty.required_with' => 'Minimal qty diskon wajib diisi.',
            'discount_tiers.*.min_qty.integer' => 'Minimal qty diskon harus angka bulat.',
            'discount_tiers.*.min_qty.min' => 'Minimal qty diskon minimal 1.',
            'discount_tiers.*.max_qty.integer' => 'Maksimal qty diskon harus angka bulat.',
            'discount_tiers.*.max_qty.min' => 'Maksimal qty diskon minimal 1.',
            'discount_tiers.*.discount_type.required_with' => 'Tipe diskon wajib dipilih.',
            'discount_tiers.*.discount_type.in' => 'Tipe diskon tidak valid.',
            'discount_tiers.*.discount_value.required_with' => 'Nilai diskon wajib diisi.',
            'discount_tiers.*.discount_value.numeric' => 'Nilai diskon harus berupa angka.',
            'discount_tiers.*.discount_value.min' => 'Nilai diskon tidak boleh kurang dari 0.',
        ])->after(function ($validator) use ($request) {
            if ($request->input('tipe_harga') === 'bundle') {
                $items = $request->input('items', []);
                $validItems = collect(is_array($items) ? $items : [])
                    ->filter(function ($item) {
                        return !empty($item['produk_id']) && (int) ($item['qty'] ?? 0) > 0;
                    })
                    ->count();

                if ($validItems < 1) {
                    $validator->errors()->add('items', 'Isi bundle minimal 1 produk.');
                }
            }

            $tiers = $request->input('discount_tiers', []);

            if (!is_array($tiers)) {
                return;
            }

            foreach ($tiers as $index => $tier) {
                $minQty = (int) ($tier['min_qty'] ?? 0);
                $maxQty = isset($tier['max_qty']) && $tier['max_qty'] !== ''
                    ? (int) $tier['max_qty']
                    : null;

                if ($maxQty !== null && $maxQty < $minQty) {
                    $validator->errors()->add(
                        "discount_tiers.$index.max_qty",
                        'Maksimal qty harus kosong atau lebih besar/sama dengan minimal qty.'
                    );
                }

                if (($tier['discount_type'] ?? null) === 'percent' && (float) ($tier['discount_value'] ?? 0) > 100) {
                    $validator->errors()->add(
                        "discount_tiers.$index.discount_value",
                        'Diskon persen maksimal 100%.'
                    );
                }
            }
        });
    }

    private function syncBundleDetails(string $produkPriceId, array $items): void
    {
        DB::table($this->bundleDetailTable)
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

        foreach ($items as $item) {
            if (empty($item['produk_id']) || (int) ($item['qty'] ?? 0) <= 0) {
                continue;
            }

            DB::table($this->bundleDetailTable)->insert([
                'id' => (string) Str::uuid(),
                'produk_price_id' => $produkPriceId,
                'produk_id' => $item['produk_id'],
                'qty' => (int) $item['qty'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function syncDiscountTiers(string $produkPriceId, array $discountTiers): void
    {
        DB::table($this->discountTable)
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->update([
                'deleted_at' => now(),
                'updated_at' => now(),
            ]);

        foreach ($discountTiers as $tier) {
            $minQty = (int) ($tier['min_qty'] ?? 0);
            $maxQty = isset($tier['max_qty']) && $tier['max_qty'] !== ''
                ? (int) $tier['max_qty']
                : null;

            $discountType = $tier['discount_type'] ?? 'percent';
            $discountValue = (float) ($tier['discount_value'] ?? 0);
            $isActive = array_key_exists('is_active', $tier)
                ? (bool) $tier['is_active']
                : true;

            if ($minQty < 1 || $discountValue < 0) {
                continue;
            }

            if ($maxQty !== null && $maxQty < $minQty) {
                continue;
            }

            if (!in_array($discountType, ['percent', 'nominal'], true)) {
                continue;
            }

            if ($discountType === 'percent' && $discountValue > 100) {
                continue;
            }

            DB::table($this->discountTable)->insert([
                'id' => (string) Str::uuid(),
                'produk_price_id' => $produkPriceId,
                'min_qty' => $minQty,
                'max_qty' => $maxQty,
                'discount_type' => $discountType,
                'discount_value' => $discountValue,
                'is_active' => $isActive,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function getDiscountTiers(string $produkPriceId)
    {
        return DB::table($this->discountTable)
            ->where('produk_price_id', $produkPriceId)
            ->whereNull('deleted_at')
            ->orderBy('min_qty')
            ->orderBy('max_qty')
            ->get()
            ->map(function ($tier) {
                return [
                    'id' => $tier->id,
                    'produk_price_id' => $tier->produk_price_id,
                    'min_qty' => (int) $tier->min_qty,
                    'max_qty' => $tier->max_qty !== null ? (int) $tier->max_qty : null,
                    'discount_type' => $tier->discount_type,
                    'discount_value' => (float) $tier->discount_value,
                    'is_active' => (bool) $tier->is_active,
                    'created_at' => $tier->created_at,
                    'updated_at' => $tier->updated_at,
                ];
            })
            ->values();
    }

    private function getBundleDetails(string $produkPriceId)
    {
        return DB::table($this->bundleDetailTable . ' as ppd')
            ->leftJoin('produk as p', function ($join) {
                $join->on('p.id', '=', 'ppd.produk_id')
                    ->whereNull('p.deleted_at');
            })
            ->where('ppd.produk_price_id', $produkPriceId)
            ->whereNull('ppd.deleted_at')
            ->select([
                'ppd.id',
                'ppd.produk_price_id',
                'ppd.produk_id',
                'ppd.qty',
                'ppd.created_at',
                'ppd.updated_at',

                'p.nama_produk',
                'p.product_number',
                'p.code_gs1',
            ])
            ->orderBy('ppd.created_at')
            ->get()
            ->map(function ($detail) {
                return [
                    'id' => $detail->id,
                    'produk_price_id' => $detail->produk_price_id,
                    'produk_id' => $detail->produk_id,
                    'qty' => (int) $detail->qty,
                    'created_at' => $detail->created_at,
                    'updated_at' => $detail->updated_at,
                    'produk' => [
                        'id' => $detail->produk_id,
                        'nama_produk' => $detail->nama_produk,
                        'product_number' => $detail->product_number,
                        'code_gs1' => $detail->code_gs1,
                    ],
                ];
            })
            ->values();
    }

    private function findDetail(string $id): ?array
    {
        $row = DB::table($this->produkPriceTable . ' as pp')
            ->leftJoin('produk as p', function ($join) {
                $join->on('p.id', '=', 'pp.produk_id')
                    ->whereNull('p.deleted_at');
            })
            ->leftJoin('data_event as de', function ($join) {
                $join->on('de.id', '=', 'pp.event_id')
                    ->whereNull('de.deleted_at');
            })
            ->where('pp.id', $id)
            ->whereNull('pp.deleted_at')
            ->select([
                'pp.id',
                'pp.produk_id',
                'pp.harga_produk',
                'pp.created_at',
                'pp.updated_at',
                'pp.deleted_at',
                'pp.event_id',
                'pp.tipe_harga',
                'pp.nama_bundle',

                'p.nama_produk',
                'p.product_number',
                'p.code_gs1',

                'de.nama_event',
                'de.alamat_event',
                'de.valid_from',
                'de.valid_until',
            ])
            ->first();

        if (!$row) {
            return null;
        }

        return $this->formatRow($row);
    }

    private function formatRow(object $row): array
    {
        $tipeHarga = $row->tipe_harga ?: ($row->nama_bundle ? 'bundle' : 'single');

        return [
            'id' => $row->id,
            'produk_id' => $row->produk_id,
            'harga_produk' => $row->harga_produk,
            'discount_tiers' => $this->getDiscountTiers($row->id),
            'created_at' => $row->created_at,
            'updated_at' => $row->updated_at,
            'event_id' => $row->event_id,
            'tipe_harga' => $tipeHarga,
            'nama_bundle' => $row->nama_bundle,

            'display_name' => $tipeHarga === 'bundle'
                ? ($row->nama_bundle ?: 'Bundle Tanpa Nama')
                : ($row->nama_produk ?: '-'),

            'produk' => $row->produk_id ? [
                'id' => $row->produk_id,
                'nama_produk' => $row->nama_produk,
                'product_number' => $row->product_number,
                'code_gs1' => $row->code_gs1,
            ] : null,

            'event' => $row->event_id ? [
                'id' => $row->event_id,
                'nama_event' => $row->nama_event,
                'alamat_event' => $row->alamat_event,
                'valid_from' => $row->valid_from,
                'valid_until' => $row->valid_until,
            ] : null,

            'bundle_details' => $tipeHarga === 'bundle'
                ? $this->getBundleDetails($row->id)
                : [],
        ];
    }
}
