<?php

namespace App\Http\Controllers\Maintenance;

use App\Http\Controllers\Controller;
use App\Models\DataKendaraan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DataKendaraanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $jenisKendaraan = $request->query('jenis_kendaraan');
        $statusPembelian = $request->query('status_pembelian');
        $statusKendaraan = $request->query('status_kendaraan');

        $kendaraans = DataKendaraan::query()
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($query) use ($search) {
                    $query->where('kode_kendaraan', 'like', "%{$search}%")
                        ->orWhere('nama_kendaraan', 'like', "%{$search}%")
                        ->orWhere('nomor_polisi', 'like', "%{$search}%")
                        ->orWhere('merk', 'like', "%{$search}%")
                        ->orWhere('tipe', 'like', "%{$search}%")
                        ->orWhere('warna', 'like', "%{$search}%")
                        ->orWhere('nomor_rangka', 'like', "%{$search}%")
                        ->orWhere('nomor_mesin', 'like', "%{$search}%")
                        ->orWhere('penanggung_jawab', 'like', "%{$search}%")
                        ->orWhere('lokasi_kendaraan', 'like', "%{$search}%");
                });
            })
            ->when(filled($jenisKendaraan), fn ($query) => $query->where('jenis_kendaraan', $jenisKendaraan))
            ->when(filled($statusPembelian), fn ($query) => $query->where('status_pembelian', $statusPembelian))
            ->when(filled($statusKendaraan), fn ($query) => $query->where('status_kendaraan', $statusKendaraan))
            ->orderByRaw("CASE WHEN status_kendaraan = 'aktif' THEN 0 ELSE 1 END")
            ->orderBy('jenis_kendaraan')
            ->orderBy('nama_kendaraan')
            ->get();

        return response()->json([
            'message' => 'Data kendaraan berhasil diambil.',
            'data' => $kendaraans
                ->map(fn (DataKendaraan $kendaraan) => $this->formatKendaraan($kendaraan))
                ->values(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateRequest($request);

        $validated['kode_kendaraan'] = $validated['kode_kendaraan']
            ?: $this->generateKodeKendaraan($validated['jenis_kendaraan']);

        $kendaraan = DataKendaraan::create($validated);

        return response()->json([
            'message' => 'Data kendaraan berhasil ditambahkan.',
            'data' => $this->formatKendaraan($kendaraan),
        ], 201);
    }

    public function show(DataKendaraan $dataKendaraan): JsonResponse
    {
        return response()->json([
            'message' => 'Detail kendaraan berhasil diambil.',
            'data' => $this->formatKendaraan($dataKendaraan),
        ]);
    }

    public function update(Request $request, DataKendaraan $dataKendaraan): JsonResponse
    {
        $validated = $this->validateRequest($request, $dataKendaraan);

        $validated['kode_kendaraan'] = $validated['kode_kendaraan']
            ?: $dataKendaraan->kode_kendaraan
            ?: $this->generateKodeKendaraan($validated['jenis_kendaraan']);

        $dataKendaraan->update($validated);

        return response()->json([
            'message' => 'Data kendaraan berhasil diperbarui.',
            'data' => $this->formatKendaraan($dataKendaraan->fresh()),
        ]);
    }

    public function destroy(DataKendaraan $dataKendaraan): JsonResponse
    {
        $dataKendaraan->delete();

        return response()->json([
            'message' => 'Data kendaraan berhasil dihapus.',
        ]);
    }

    private function validateRequest(Request $request, ?DataKendaraan $dataKendaraan = null): array
    {
        $request->merge([
            'kode_kendaraan' => strtoupper(trim((string) $request->input('kode_kendaraan', ''))),
            'nomor_polisi' => strtoupper(trim((string) $request->input('nomor_polisi', ''))),
            'tahun_pembuatan' => $request->filled('tahun_pembuatan')
                ? (int) $request->input('tahun_pembuatan')
                : null,
            'odometer' => (int) $request->input('odometer', 0),
            'harga_pembelian' => (int) $request->input('harga_pembelian', 0),
        ]);

        return $request->validate([
            'kode_kendaraan' => [
                'nullable',
                'string',
                'max:50',
                Rule::unique('data_kendaraans', 'kode_kendaraan')->ignore($dataKendaraan?->id),
            ],
            'nama_kendaraan' => ['required', 'string', 'max:150'],
            'jenis_kendaraan' => ['required', 'string', Rule::in(['mobil', 'motor'])],
            'status_pembelian' => ['required', 'string', Rule::in(['baru', 'bekas'])],
            'status_kendaraan' => ['required', 'string', Rule::in(['aktif', 'service', 'nonaktif', 'dijual'])],

            'nomor_polisi' => [
                'required',
                'string',
                'max:30',
                Rule::unique('data_kendaraans', 'nomor_polisi')->ignore($dataKendaraan?->id),
            ],
            'merk' => ['nullable', 'string', 'max:100'],
            'tipe' => ['nullable', 'string', 'max:100'],
            'tahun_pembuatan' => ['nullable', 'integer', 'min:1950', 'max:' . ((int) date('Y') + 1)],
            'warna' => ['nullable', 'string', 'max:50'],
            'nomor_rangka' => ['nullable', 'string', 'max:100'],
            'nomor_mesin' => ['nullable', 'string', 'max:100'],

            'kapasitas_mesin' => ['nullable', 'string', 'max:50'],
            'bahan_bakar' => ['nullable', 'string', 'max:50'],
            'transmisi' => ['nullable', 'string', 'max:50'],
            'odometer' => ['nullable', 'integer', 'min:0'],

            'tanggal_pembelian' => ['nullable', 'date'],
            'harga_pembelian' => ['nullable', 'integer', 'min:0'],
            'sumber_pembelian' => ['nullable', 'string', 'max:150'],
            'penanggung_jawab' => ['nullable', 'string', 'max:150'],
            'lokasi_kendaraan' => ['nullable', 'string', 'max:150'],
            'catatan' => ['nullable', 'string'],
        ], [
            'nama_kendaraan.required' => 'Nama kendaraan wajib diisi.',
            'jenis_kendaraan.required' => 'Jenis kendaraan wajib dipilih.',
            'jenis_kendaraan.in' => 'Jenis kendaraan harus mobil atau motor.',
            'status_pembelian.required' => 'Status pembelian wajib dipilih.',
            'status_pembelian.in' => 'Status pembelian harus baru atau bekas.',
            'status_kendaraan.required' => 'Status kendaraan wajib dipilih.',
            'nomor_polisi.required' => 'Nomor polisi wajib diisi.',
            'nomor_polisi.unique' => 'Nomor polisi sudah digunakan.',
            'kode_kendaraan.unique' => 'Kode kendaraan sudah digunakan.',
            'tahun_pembuatan.min' => 'Tahun pembuatan tidak valid.',
            'tahun_pembuatan.max' => 'Tahun pembuatan tidak valid.',
        ]);
    }

    private function formatKendaraan(DataKendaraan $kendaraan): array
    {
        return [
            'id' => $kendaraan->id,
            'kode_kendaraan' => $kendaraan->kode_kendaraan,
            'nama_kendaraan' => $kendaraan->nama_kendaraan,
            'jenis_kendaraan' => $kendaraan->jenis_kendaraan,
            'status_pembelian' => $kendaraan->status_pembelian,
            'status_kendaraan' => $kendaraan->status_kendaraan,
            'nomor_polisi' => $kendaraan->nomor_polisi,
            'merk' => $kendaraan->merk,
            'tipe' => $kendaraan->tipe,
            'tahun_pembuatan' => $kendaraan->tahun_pembuatan,
            'warna' => $kendaraan->warna,
            'nomor_rangka' => $kendaraan->nomor_rangka,
            'nomor_mesin' => $kendaraan->nomor_mesin,
            'kapasitas_mesin' => $kendaraan->kapasitas_mesin,
            'bahan_bakar' => $kendaraan->bahan_bakar,
            'transmisi' => $kendaraan->transmisi,
            'odometer' => $kendaraan->odometer,
            'tanggal_pembelian' => optional($kendaraan->tanggal_pembelian)->format('Y-m-d'),
            'harga_pembelian' => $kendaraan->harga_pembelian,
            'sumber_pembelian' => $kendaraan->sumber_pembelian,
            'penanggung_jawab' => $kendaraan->penanggung_jawab,
            'lokasi_kendaraan' => $kendaraan->lokasi_kendaraan,
            'catatan' => $kendaraan->catatan,
        ];
    }

    private function generateKodeKendaraan(string $jenisKendaraan): string
    {
        $prefix = $jenisKendaraan === 'motor' ? 'MTR' : 'MBL';
        $date = now()->format('ymd');

        $lastNumber = DataKendaraan::withTrashed()
            ->where('kode_kendaraan', 'like', "{$prefix}-{$date}-%")
            ->count() + 1;

        return $prefix . '-' . $date . '-' . str_pad((string) $lastNumber, 4, '0', STR_PAD_LEFT);
    }
}
