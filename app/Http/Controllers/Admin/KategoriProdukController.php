<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\KategoriProduk;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class KategoriProdukController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 10);

        if ($perPage <= 0) {
            $perPage = 10;
        }

        if ($perPage > 100) {
            $perPage = 100;
        }

        $rows = KategoriProduk::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('kategori', 'ilike', '%' . $search . '%');
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data kategori produk berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'kategori' => [
                'required',
                'string',
                'max:150',
                Rule::unique('kategori_produk', 'kategori')->whereNull('deleted_at'),
            ],
        ], [
            'kategori.required' => 'Kategori produk wajib diisi.',
            'kategori.string' => 'Kategori produk harus berupa teks.',
            'kategori.max' => 'Kategori produk maksimal 150 karakter.',
            'kategori.unique' => 'Kategori produk sudah digunakan.',
        ]);

        $validated['kategori'] = trim($validated['kategori']);

        $row = KategoriProduk::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori produk berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = KategoriProduk::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail kategori produk berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = KategoriProduk::findOrFail($id);

        $validated = $request->validate([
            'kategori' => [
                'required',
                'string',
                'max:150',
                Rule::unique('kategori_produk', 'kategori')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
        ], [
            'kategori.required' => 'Kategori produk wajib diisi.',
            'kategori.string' => 'Kategori produk harus berupa teks.',
            'kategori.max' => 'Kategori produk maksimal 150 karakter.',
            'kategori.unique' => 'Kategori produk sudah digunakan.',
        ]);

        $validated['kategori'] = trim($validated['kategori']);

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Kategori produk berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = KategoriProduk::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Kategori produk berhasil dihapus.',
        ]);
    }
}