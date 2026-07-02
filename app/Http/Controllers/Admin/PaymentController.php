<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $status = $request->query('status');
        $perPage = (int) $request->query('per_page', 10);

        if ($perPage <= 0) {
            $perPage = 10;
        }

        if ($perPage > 100) {
            $perPage = 100;
        }

        $rows = Payment::query()
            ->select([
                'id',
                'payment',
                'is_active',
                'created_at',
                'updated_at',
            ])
            ->when($search !== '', function ($query) use ($search) {
                $keyword = '%' . mb_strtolower($search) . '%';

                $query->whereRaw('LOWER(payment) LIKE ?', [$keyword]);
            })
            ->when($status !== null && $status !== '', function ($query) use ($status) {
                if ($status === 'active') {
                    $query->where('is_active', true);
                }

                if ($status === 'inactive') {
                    $query->where('is_active', false);
                }
            })
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'Data payment berhasil dimuat.',
            'data' => $rows,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validatePayload($request);

        $this->validateDuplicatePayment($validated['payment']);

        $row = Payment::create([
            'payment' => $validated['payment'],
            'is_active' => $validated['is_active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data payment berhasil ditambahkan.',
            'data' => $row,
        ], 201);
    }

    public function show(string $id)
    {
        $row = Payment::query()->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'Detail payment berhasil dimuat.',
            'data' => $row,
        ]);
    }

    public function update(Request $request, string $id)
    {
        $row = Payment::query()->findOrFail($id);

        $validated = $this->validatePayload($request);

        $this->validateDuplicatePayment(
            payment: $validated['payment'],
            ignoreId: $row->id
        );

        $row->update([
            'payment' => $validated['payment'],
            'is_active' => $validated['is_active'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Data payment berhasil diperbarui.',
            'data' => $row->fresh(),
        ]);
    }

    public function destroy(string $id)
    {
        $row = Payment::query()->findOrFail($id);

        $row->delete();

        return response()->json([
            'success' => true,
            'message' => 'Data payment berhasil dihapus.',
        ]);
    }

    private function validatePayload(Request $request): array
    {
        $validated = $request->validate([
            'payment' => [
                'required',
                'string',
                'max:255',
            ],
            'is_active' => [
                'required',
                'boolean',
            ],
        ], [
            'payment.required' => 'Nama payment wajib diisi.',
            'payment.string' => 'Nama payment harus berupa teks.',
            'payment.max' => 'Nama payment maksimal 255 karakter.',

            'is_active.required' => 'Status wajib dipilih.',
            'is_active.boolean' => 'Status tidak valid.',
        ]);

        $validated['payment'] = trim((string) $validated['payment']);
        $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

        return $validated;
    }

    private function validateDuplicatePayment(string $payment, ?string $ignoreId = null): void
    {
        $exists = Payment::query()
            ->whereRaw('LOWER(payment) = ?', [mb_strtolower(trim($payment))])
            ->when($ignoreId, function ($query) use ($ignoreId) {
                $query->where('id', '!=', $ignoreId);
            })
            ->whereNull('deleted_at')
            ->exists();

        if ($exists) {
            abort(response()->json([
                'message' => 'Nama payment sudah tersedia.',
                'errors' => [
                    'payment' => [
                        'Nama payment sudah tersedia.',
                    ],
                ],
            ], 422));
        }
    }
}