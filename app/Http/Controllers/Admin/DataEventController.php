<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DataEvent;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DataEventController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $perPage = (int) $request->query('per_page', 10);
        $status = $request->query('status');

        if ($perPage <= 0) {
            $perPage = 10;
        }

        if ($perPage > 100) {
            $perPage = 100;
        }

        $today = now()->toDateString();

        $rows = DataEvent::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($subQuery) use ($search) {
                    $subQuery
                        ->where('nama_event', 'ilike', '%' . $search . '%')
                        ->orWhere('alamat_event', 'ilike', '%' . $search . '%');
                });
            })
            ->when($status === 'active', function ($query) use ($today) {
                $query
                    ->whereDate('valid_from', '<=', $today)
                    ->whereDate('valid_until', '>=', $today);
            })
            ->when($status === 'upcoming', function ($query) use ($today) {
                $query->whereDate('valid_from', '>', $today);
            })
            ->when($status === 'expired', function ($query) use ($today) {
                $query->whereDate('valid_until', '<', $today);
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data event berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nama_event' => [
                'required',
                'string',
                'max:200',
                Rule::unique('data_event', 'nama_event')->whereNull('deleted_at'),
            ],
            'alamat_event' => [
                'nullable',
                'string',
                'max:500',
            ],
            'valid_from' => [
                'required',
                'date',
            ],
            'valid_until' => [
                'required',
                'date',
                'after_or_equal:valid_from',
            ],
        ], [
            'nama_event.required' => 'Nama event wajib diisi.',
            'nama_event.string' => 'Nama event harus berupa teks.',
            'nama_event.max' => 'Nama event maksimal 200 karakter.',
            'nama_event.unique' => 'Nama event sudah digunakan.',

            'alamat_event.string' => 'Alamat event harus berupa teks.',
            'alamat_event.max' => 'Alamat event maksimal 500 karakter.',

            'valid_from.required' => 'Tanggal mulai event wajib diisi.',
            'valid_from.date' => 'Tanggal mulai event tidak valid.',

            'valid_until.required' => 'Tanggal selesai event wajib diisi.',
            'valid_until.date' => 'Tanggal selesai event tidak valid.',
            'valid_until.after_or_equal' => 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.',
        ]);

        $validated['nama_event'] = trim($validated['nama_event']);
        $validated['alamat_event'] = isset($validated['alamat_event'])
            ? trim((string) $validated['alamat_event'])
            : null;

        if ($validated['alamat_event'] === '') {
            $validated['alamat_event'] = null;
        }

        $row = DataEvent::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Event berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = DataEvent::findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail event berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = DataEvent::findOrFail($id);

        $validated = $request->validate([
            'nama_event' => [
                'required',
                'string',
                'max:200',
                Rule::unique('data_event', 'nama_event')
                    ->ignore($row->id, 'id')
                    ->whereNull('deleted_at'),
            ],
            'alamat_event' => [
                'nullable',
                'string',
                'max:500',
            ],
            'valid_from' => [
                'required',
                'date',
            ],
            'valid_until' => [
                'required',
                'date',
                'after_or_equal:valid_from',
            ],
        ], [
            'nama_event.required' => 'Nama event wajib diisi.',
            'nama_event.string' => 'Nama event harus berupa teks.',
            'nama_event.max' => 'Nama event maksimal 200 karakter.',
            'nama_event.unique' => 'Nama event sudah digunakan.',

            'alamat_event.string' => 'Alamat event harus berupa teks.',
            'alamat_event.max' => 'Alamat event maksimal 500 karakter.',

            'valid_from.required' => 'Tanggal mulai event wajib diisi.',
            'valid_from.date' => 'Tanggal mulai event tidak valid.',

            'valid_until.required' => 'Tanggal selesai event wajib diisi.',
            'valid_until.date' => 'Tanggal selesai event tidak valid.',
            'valid_until.after_or_equal' => 'Tanggal selesai tidak boleh lebih kecil dari tanggal mulai.',
        ]);

        $validated['nama_event'] = trim($validated['nama_event']);
        $validated['alamat_event'] = isset($validated['alamat_event'])
            ? trim((string) $validated['alamat_event'])
            : null;

        if ($validated['alamat_event'] === '') {
            $validated['alamat_event'] = null;
        }

        $row->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Event berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = DataEvent::findOrFail($id);
        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event berhasil dihapus.',
        ]);
    }
}