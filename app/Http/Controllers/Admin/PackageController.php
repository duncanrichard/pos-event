<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Package;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PackageController extends Controller
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

        $rows = Package::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where('package', 'ilike', '%' . $search . '%');
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data package berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'package' => [
                'required',
                'string',
                'max:150',
                Rule::unique('packages', 'package')->whereNull('deleted_at'),
            ],
        ], [
            'package.required' => 'Package wajib diisi.',
            'package.string' => 'Package harus berupa teks.',
            'package.max' => 'Package maksimal 150 karakter.',
            'package.unique' => 'Package sudah digunakan.',
        ]);

        $validated['package'] = trim($validated['package']);

        $row = Package::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Package berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = Package::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail package berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = Package::findOrFail($id);

        $validated = $request->validate([
            'package' => [
                'required',
                'string',
                'max:150',
                Rule::unique('packages', 'package')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
        ], [
            'package.required' => 'Package wajib diisi.',
            'package.string' => 'Package harus berupa teks.',
            'package.max' => 'Package maksimal 150 karakter.',
            'package.unique' => 'Package sudah digunakan.',
        ]);

        $validated['package'] = trim($validated['package']);

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Package berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = Package::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Package berhasil dihapus.',
        ]);
    }
}