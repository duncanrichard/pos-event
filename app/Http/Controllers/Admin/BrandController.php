<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class BrandController extends Controller
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

        $rows = Brand::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('brand', 'ilike', '%' . $search . '%');
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data brand berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'brand' => [
                'required',
                'string',
                'max:150',
                Rule::unique('brands', 'brand')->whereNull('deleted_at'),
            ],
        ], [
            'brand.required' => 'Brand wajib diisi.',
            'brand.string' => 'Brand harus berupa teks.',
            'brand.max' => 'Brand maksimal 150 karakter.',
            'brand.unique' => 'Brand sudah digunakan.',
        ]);

        $validated['brand'] = trim($validated['brand']);

        $row = Brand::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Brand berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = Brand::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail brand berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = Brand::findOrFail($id);

        $validated = $request->validate([
            'brand' => [
                'required',
                'string',
                'max:150',
                Rule::unique('brands', 'brand')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
        ], [
            'brand.required' => 'Brand wajib diisi.',
            'brand.string' => 'Brand harus berupa teks.',
            'brand.max' => 'Brand maksimal 150 karakter.',
            'brand.unique' => 'Brand sudah digunakan.',
        ]);

        $validated['brand'] = trim($validated['brand']);

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Brand berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = Brand::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Brand berhasil dihapus.',
        ]);
    }
}