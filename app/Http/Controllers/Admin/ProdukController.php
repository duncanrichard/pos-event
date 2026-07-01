<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use App\Models\KategoriProduk;
use App\Models\Package;
use App\Models\Produk;
use App\Models\Satuan;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Picqer\Barcode\BarcodeGeneratorPNG;

class ProdukController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 10);

        $kategoriProdukId = $request->query('kategori_produk_id');
        $brandId = $request->query('brand_id');
        $satuanId = $request->query('satuan_id');
        $packageId = $request->query('package_id');
        $onlyHasGs1 = filter_var($request->query('only_has_gs1', false), FILTER_VALIDATE_BOOLEAN);

        if ($perPage <= 0) {
            $perPage = 10;
        }

        if ($perPage > 100) {
            $perPage = 100;
        }

        $rows = $this->produkQuery($request)
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data produk berhasil dimuat.',
            'data' => $rows,
            'filters' => [
                'search' => $search,
                'kategori_produk_id' => $kategoriProdukId,
                'brand_id' => $brandId,
                'satuan_id' => $satuanId,
                'package_id' => $packageId,
                'only_has_gs1' => $onlyHasGs1,
            ],
        ]);
    }

    public function options()
    {
        return response()->json([
            'success' => true,
            'message' => 'Data pilihan produk berhasil dimuat.',
            'data' => [
                'kategori_produk' => KategoriProduk::query()
                    ->select('id', 'kategori')
                    ->orderBy('kategori')
                    ->get(),

                'brands' => Brand::query()
                    ->select('id', 'brand')
                    ->orderBy('brand')
                    ->get(),

                'satuans' => Satuan::query()
                    ->select('id', 'satuan')
                    ->orderBy('satuan')
                    ->get(),

                'packages' => Package::query()
                    ->select('id', 'package')
                    ->orderBy('package')
                    ->get(),
            ],
        ]);
    }

    public function exportGs1Pdf(Request $request)
    {
        $rows = $this->produkQuery($request)
            ->whereNotNull('code_gs1')
            ->where('code_gs1', '!=', '')
            ->orderBy('nama_produk')
            ->get();

        $barcodeGenerator = new BarcodeGeneratorPNG();

        $rows = $rows->map(function ($row) use ($barcodeGenerator) {
            $code = trim((string) $row->code_gs1);
            $format = preg_match('/^\d{13}$/', $code)
                ? $barcodeGenerator::TYPE_EAN_13
                : $barcodeGenerator::TYPE_CODE_128;

            $row->barcode_base64 = null;

            if ($code !== '') {
                try {
                    $row->barcode_base64 = base64_encode(
                        $barcodeGenerator->getBarcode($code, $format, 2, 60)
                    );
                } catch (\Throwable $error) {
                    $row->barcode_base64 = null;
                }
            }

            return $row;
        });

        $pdf = Pdf::loadView('pdf.produk-gs1', [
            'rows' => $rows,
            'printedAt' => now()->format('d/m/Y H:i'),
        ])->setPaper('a4', 'portrait');

        $fileName = 'cetak-gs1-produk-' . now()->format('Ymd-His') . '.pdf';

        return $pdf->download($fileName);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'kategori_produk_id' => ['nullable', 'uuid', 'exists:kategori_produk,id'],
            'brand_id' => ['nullable', 'uuid', 'exists:brands,id'],
            'satuan_id' => ['nullable', 'uuid', 'exists:satuans,id'],
            'package_id' => ['nullable', 'uuid', 'exists:packages,id'],

            'nama_produk' => ['required', 'string', 'max:200'],
            'product_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('produk', 'product_number')->whereNull('deleted_at'),
            ],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'code_gs1' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('produk', 'code_gs1')->whereNull('deleted_at'),
            ],
            'image' => ['nullable', 'string', 'max:500'],
        ], [
            'nama_produk.required' => 'Nama produk wajib diisi.',
            'nama_produk.max' => 'Nama produk maksimal 200 karakter.',
            'product_number.unique' => 'Product number sudah digunakan.',
            'code_gs1.unique' => 'Code GS1 sudah digunakan.',
        ]);

        $validated = $this->normalizePayload($validated);

        $row = Produk::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil ditambahkan.',
            'data' => $row->load([
                'kategoriProduk:id,kategori',
                'brand:id,brand',
                'satuan:id,satuan',
                'package:id,package',
            ]),
        ], 201);
    }

    public function show(string $id)
    {
        $row = Produk::query()
            ->with([
                'kategoriProduk:id,kategori',
                'brand:id,brand',
                'satuan:id,satuan',
                'package:id,package',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail produk berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = Produk::findOrFail($id);

        $validated = $request->validate([
            'kategori_produk_id' => ['nullable', 'uuid', 'exists:kategori_produk,id'],
            'brand_id' => ['nullable', 'uuid', 'exists:brands,id'],
            'satuan_id' => ['nullable', 'uuid', 'exists:satuans,id'],
            'package_id' => ['nullable', 'uuid', 'exists:packages,id'],

            'nama_produk' => ['required', 'string', 'max:200'],
            'product_number' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('produk', 'product_number')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'code_gs1' => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('produk', 'code_gs1')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
            'image' => ['nullable', 'string', 'max:500'],
        ], [
            'nama_produk.required' => 'Nama produk wajib diisi.',
            'nama_produk.max' => 'Nama produk maksimal 200 karakter.',
            'product_number.unique' => 'Product number sudah digunakan.',
            'code_gs1.unique' => 'Code GS1 sudah digunakan.',
        ]);

        $validated = $this->normalizePayload($validated);

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil diperbarui.',
            'data' => $row->fresh()->load([
                'kategoriProduk:id,kategori',
                'brand:id,brand',
                'satuan:id,satuan',
                'package:id,package',
            ]),
        ]);
    }

    public function destroy(string $id)
    {
        $row = Produk::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Produk berhasil dihapus.',
        ]);
    }

    private function produkQuery(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $kategoriProdukId = $request->query('kategori_produk_id');
        $brandId = $request->query('brand_id');
        $satuanId = $request->query('satuan_id');
        $packageId = $request->query('package_id');
        $onlyHasGs1 = filter_var($request->query('only_has_gs1', false), FILTER_VALIDATE_BOOLEAN);

        return Produk::query()
            ->with([
                'kategoriProduk:id,kategori',
                'brand:id,brand',
                'satuan:id,satuan',
                'package:id,package',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('nama_produk', 'ilike', '%' . $search . '%')
                        ->orWhere('product_number', 'ilike', '%' . $search . '%')
                        ->orWhere('code_gs1', 'ilike', '%' . $search . '%');
                });
            })
            ->when($kategoriProdukId, function ($query) use ($kategoriProdukId) {
                $query->where('kategori_produk_id', $kategoriProdukId);
            })
            ->when($brandId, function ($query) use ($brandId) {
                $query->where('brand_id', $brandId);
            })
            ->when($satuanId, function ($query) use ($satuanId) {
                $query->where('satuan_id', $satuanId);
            })
            ->when($packageId, function ($query) use ($packageId) {
                $query->where('package_id', $packageId);
            })
            ->when($onlyHasGs1, function ($query) {
                $query
                    ->whereNotNull('code_gs1')
                    ->where('code_gs1', '!=', '');
            });
    }

    private function normalizePayload(array $payload): array
    {
        $nullableFields = [
            'kategori_produk_id',
            'brand_id',
            'satuan_id',
            'package_id',
            'product_number',
            'weight',
            'code_gs1',
            'image',
        ];

        $payload['nama_produk'] = trim((string) $payload['nama_produk']);

        foreach ($nullableFields as $field) {
            if (!array_key_exists($field, $payload)) {
                $payload[$field] = null;
                continue;
            }

            if ($payload[$field] === '' || $payload[$field] === false) {
                $payload[$field] = null;
            }

            if (is_string($payload[$field])) {
                $payload[$field] = trim($payload[$field]);
            }
        }

        return $payload;
    }
}