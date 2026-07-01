<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Satuan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SatuanController extends Controller
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

        $rows = Satuan::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('satuan', 'ilike', '%' . $search . '%');
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data satuan berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'satuan' => [
                'required',
                'string',
                'max:150',
                Rule::unique('satuans', 'satuan')->whereNull('deleted_at'),
            ],
        ], [
            'satuan.required' => 'Satuan wajib diisi.',
            'satuan.string' => 'Satuan harus berupa teks.',
            'satuan.max' => 'Satuan maksimal 150 karakter.',
            'satuan.unique' => 'Satuan sudah digunakan.',
        ]);

        $validated['satuan'] = trim($validated['satuan']);

        $row = Satuan::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Satuan berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = Satuan::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail satuan berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = Satuan::findOrFail($id);

        $validated = $request->validate([
            'satuan' => [
                'required',
                'string',
                'max:150',
                Rule::unique('satuans', 'satuan')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
        ], [
            'satuan.required' => 'Satuan wajib diisi.',
            'satuan.string' => 'Satuan harus berupa teks.',
            'satuan.max' => 'Satuan maksimal 150 karakter.',
            'satuan.unique' => 'Satuan sudah digunakan.',
        ]);

        $validated['satuan'] = trim($validated['satuan']);

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Satuan berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = Satuan::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Satuan berhasil dihapus.',
        ]);
    }
}