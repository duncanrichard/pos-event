<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Cetak GS1 Produk</title>
    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: DejaVu Sans, sans-serif;
            color: #111827;
            font-size: 11px;
        }

        .header {
            border-bottom: 2px solid #111827;
            padding-bottom: 10px;
            margin-bottom: 14px;
        }

        .title {
            font-size: 20px;
            font-weight: bold;
            margin: 0;
        }

        .subtitle {
            margin-top: 4px;
            font-size: 11px;
            color: #4b5563;
        }

        .summary {
            margin-top: 8px;
            font-size: 11px;
        }

        .grid {
            width: 100%;
        }

        .card {
            width: 49%;
            display: inline-block;
            vertical-align: top;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
            margin-right: 1%;
            min-height: 145px;
        }

        .product-name {
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 3px;
        }

        .product-number {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 8px;
        }

        .barcode-wrap {
            text-align: center;
            padding: 6px 4px;
            border: 1px dashed #d1d5db;
            border-radius: 6px;
            margin-top: 6px;
        }

        .barcode-wrap img {
            max-width: 100%;
            height: 54px;
        }

        .gs1 {
            margin-top: 5px;
            font-size: 10px;
            font-weight: bold;
            letter-spacing: 1px;
            text-align: center;
        }

        .meta {
            margin-top: 8px;
            font-size: 10px;
            color: #374151;
            line-height: 1.5;
        }

        .empty {
            padding: 40px;
            text-align: center;
            color: #6b7280;
            border: 1px dashed #d1d5db;
            border-radius: 8px;
        }

        .page-break {
            page-break-after: always;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">Cetak GS1 Produk</h1>
        <div class="subtitle">
            Daftar barcode batang produk untuk kebutuhan POS / scanner.
        </div>
        <div class="summary">
            Tanggal cetak: {{ $printedAt }} |
            Total produk: {{ $rows->count() }}
        </div>
    </div>

    @if ($rows->count() === 0)
        <div class="empty">
            Tidak ada produk dengan Code GS1.
        </div>
    @else
        <div class="grid">
            @foreach ($rows as $index => $row)
                <div class="card">
                    <div class="product-name">
                        {{ $row->nama_produk }}
                    </div>

                    <div class="product-number">
                        Product Number: {{ $row->product_number ?: '-' }}
                    </div>

                    <div class="barcode-wrap">
                        @if ($row->barcode_base64)
                            <img src="data:image/png;base64,{{ $row->barcode_base64 }}" alt="{{ $row->code_gs1 }}">
                        @else
                            <div style="padding: 20px 0; color: #dc2626; font-weight: bold;">
                                Barcode tidak valid
                            </div>
                        @endif

                        <div class="gs1">
                            {{ $row->code_gs1 }}
                        </div>
                    </div>

                    <div class="meta">
                        Kategori: {{ optional($row->kategoriProduk)->kategori ?: '-' }}<br>
                        Brand: {{ optional($row->brand)->brand ?: '-' }}<br>
                        Satuan: {{ optional($row->satuan)->satuan ?: '-' }} |
                        Package: {{ optional($row->package)->package ?: '-' }}
                    </div>
                </div>

                @if (($index + 1) % 8 === 0)
                    <div class="page-break"></div>
                @endif
            @endforeach
        </div>
    @endif
</body>
</html>