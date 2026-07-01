<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
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

        $rows = Supplier::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('nama_supplier', 'ilike', '%' . $search . '%')
                        ->orWhere('contact_supplier', 'ilike', '%' . $search . '%')
                        ->orWhere('alamat', 'ilike', '%' . $search . '%');
                });
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data supplier berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_supplier' => [
                'required',
                'string',
                'max:150',
                Rule::unique('suppliers', 'nama_supplier')->whereNull('deleted_at'),
            ],
            'contact_supplier' => [
                'nullable',
                'string',
                'max:50',
            ],
            'alamat' => [
                'nullable',
                'string',
                'max:500',
            ],
        ], [
            'nama_supplier.required' => 'Nama supplier wajib diisi.',
            'nama_supplier.string' => 'Nama supplier harus berupa teks.',
            'nama_supplier.max' => 'Nama supplier maksimal 150 karakter.',
            'nama_supplier.unique' => 'Nama supplier sudah digunakan.',

            'contact_supplier.string' => 'Kontak supplier harus berupa teks.',
            'contact_supplier.max' => 'Kontak supplier maksimal 50 karakter.',

            'alamat.string' => 'Alamat harus berupa teks.',
            'alamat.max' => 'Alamat maksimal 500 karakter.',
        ]);

        $validated['nama_supplier'] = trim($validated['nama_supplier']);
        $validated['contact_supplier'] = isset($validated['contact_supplier'])
            ? trim((string) $validated['contact_supplier'])
            : null;
        $validated['alamat'] = isset($validated['alamat'])
            ? trim((string) $validated['alamat'])
            : null;

        $row = Supplier::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = Supplier::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail supplier berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = Supplier::findOrFail($id);

        $validated = $request->validate([
            'nama_supplier' => [
                'required',
                'string',
                'max:150',
                Rule::unique('suppliers', 'nama_supplier')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
            'contact_supplier' => [
                'nullable',
                'string',
                'max:50',
            ],
            'alamat' => [
                'nullable',
                'string',
                'max:500',
            ],
        ], [
            'nama_supplier.required' => 'Nama supplier wajib diisi.',
            'nama_supplier.string' => 'Nama supplier harus berupa teks.',
            'nama_supplier.max' => 'Nama supplier maksimal 150 karakter.',
            'nama_supplier.unique' => 'Nama supplier sudah digunakan.',

            'contact_supplier.string' => 'Kontak supplier harus berupa teks.',
            'contact_supplier.max' => 'Kontak supplier maksimal 50 karakter.',

            'alamat.string' => 'Alamat harus berupa teks.',
            'alamat.max' => 'Alamat maksimal 500 karakter.',
        ]);

        $validated['nama_supplier'] = trim($validated['nama_supplier']);
        $validated['contact_supplier'] = isset($validated['contact_supplier'])
            ? trim((string) $validated['contact_supplier'])
            : null;
        $validated['alamat'] = isset($validated['alamat'])
            ? trim((string) $validated['alamat'])
            : null;

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = Supplier::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Supplier berhasil dihapus.',
        ]);
    }
}