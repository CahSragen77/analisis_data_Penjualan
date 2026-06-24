// Main Application
$(document).ready(function() {
    let globalData = null;
    
    // Initialize DataTables
    const transTable = $('#transTable').DataTable({
        data: [],
        columns: getTransColumns(),
        pageLength: 15,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
    
    const saleTable = $('#saleTable').DataTable({
        data: [],
        columns: getSaleColumns(),
        pageLength: 10,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
    
    const memberTable = $('#memberTable').DataTable({
        data: [],
        columns: getMemberColumns(),
        pageLength: 10,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
    
    const productTable = $('#productTable').DataTable({
        data: [],
        columns: getProductColumns(),
        pageLength: 10,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
    
    const eodTable = $('#eodTable').DataTable({
        data: [],
        columns: getEodColumns(),
        pageLength: 10,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
    
    const profitLossTable = $('#profitLossTable').DataTable({
        data: [],
        columns: getProfitLossColumns(),
        pageLength: 15,
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json'
        }
    });
    
    // File upload handler
    $('#sqlUpload').on('change', handleFileUpload);
    $('label[for="sqlUpload"]').click(() => $('#sqlUpload').click());
    $('#exportAllBtn').on('click', () => {
        if (globalData) {
            ExportManager.exportToExcel(globalData);
            showToast('Ekspor data berhasil!', 'success');
        }
    });
    
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            showToast(`Memproses ${file.name}...`, 'info');
            
            setTimeout(() => {
                const parsed = SQLParser.parseSQLCopy(e.target.result);
                globalData = parsed;
                updateUI(parsed);
                showToast(`✅ Berhasil memuat: ${parsed.c_trans.length} transaksi, ${parsed.c_tsale.length} penjualan`, 'success');
                $('#exportAllBtn').prop('disabled', false);
            }, 100);
        };
        reader.readAsText(file, 'UTF-8');
    }
    
    function updateUI(data) {
        // Update stat cards
        $('#statTrans').text(data.c_trans.length.toLocaleString());
        $('#statSale').text(data.c_tsale.length.toLocaleString());
        $('#statMember').text(data.m_cust.length.toLocaleString());
        $('#statProd').text(data.m_loader.length.toLocaleString());
        
        // Update summary and charts
        if (data.c_tsale.length > 0) {
            const summaryRows = ChartsManager.generateSummaryAndCharts(data.c_tsale);
            updateSummaryTable(summaryRows);
        } else {
            $('#summaryBody').html('<tr><td colspan="7" class="text-center text-muted">Belum ada data penjualan</td></tr>');
        }
        
        // Update detail tables
        updateTransTable(data.c_trans);
        updateSaleTable(data.c_tsale);
        updateMemberTable(data.m_cust);
        updateProductTable(data.m_loader);
        updateEodTable(data.cek_eod);
        
        // Update profit loss
        if (data.c_trans.length > 0 && data.m_loader.length > 0) {
            const plData = SQLParser.calculateProfitLoss(data);
            updateProfitLossUI(plData);
        }

        // 🚀 SEKARANG RADAR DETEKSI FRAUD SUDAH DIKAWINKAN DI SINI (Aman & Sinkron!)
        updateFraudUI(data);
    }
    
    function updateSummaryTable(rows) {
        const tbody = $('#summaryBody');
        tbody.empty();
        
        if (!globalData || !globalData.c_tsale || globalData.c_tsale.length === 0) {
            tbody.html('<tr><td colspan="7" class="text-center text-muted">Tidak ada data penjualan</td></tr>');
            return;
        }

        const dailySummary = {};
        
        globalData.c_tsale.forEach(row => {
            const tanggal = row.tgl_f;
            if (!tanggal) return;
            
            if (!dailySummary[tanggal]) {
                dailySummary[tanggal] = {
                    tanggal: tanggal,
                    total_trx: 0,
                    nominal: 0,
                    cash: 0,
                    qris_debit: 0,
                    potongan: 0,   
                    donasi: 0,
                    fix_setoran: 0
                };
            }
            
            dailySummary[tanggal].total_trx += 1;
            dailySummary[tanggal].nominal += row.jum;
            dailySummary[tanggal].cash += (row.cash > 0 ? (row.cash - row.kembali) : 0);
            dailySummary[tanggal].qris_debit += row.card || 0;
            dailySummary[tanggal].potongan += (row.hemat || 0) + (row.disc || 0);
            dailySummary[tanggal].donasi += (row.donasi || 0);
            dailySummary[tanggal].fix_setoran += (row.fix_setoran_server || 0);
        });

        const sortedDates = Object.keys(dailySummary).sort((a, b) => new Date(b) - new Date(a));

        sortedDates.forEach(date => {
            const r = dailySummary[date];
            tbody.append(`
                <tr>
                    <td><strong>${r.tanggal}</strong></td>
                    <td>${r.total_trx.toLocaleString()}</td>
                    <td>${ChartsManager.formatRupiah(r.nominal)}</td>
                    <td>${ChartsManager.formatRupiah(r.cash)}</td>
                    <td>${ChartsManager.formatRupiah(r.qris_debit)}</td>
                    <td>${ChartsManager.formatRupiah(r.potongan)}</td>
                    <td class="table-success fw-bold text-primary">${ChartsManager.formatRupiah(r.fix_setoran)}</td>
                </tr>
            `);
        });
    }    

    function updateTransTable(data) {
        const formattedData = data.map(t => ({
            no_urut: t.no_urut,
            plu: t.plu,
            descp: t.descp || '-',
            kategori: t.kategori,
            price: ChartsManager.formatRupiah(t.price),
            qty: t.qty,
            kd_kasir: t.kd_kasir,
            no_bill: t.no_bill,
            tgl_trs: t.tgl_trs,
            kd_store: t.kd_store,
            total: ChartsManager.formatRupiah((t.price || 0) * (t.qty || 0))
        }));
        
        transTable.clear();
        transTable.rows.add(formattedData);
        transTable.draw();
    }
    
    function updateSaleTable(data) {
        const formattedData = data.map(s => {
            let metode = 'Cash';
            if (s.j_card) {
                let j = s.j_card.toString().toUpperCase();
                if (j.includes('QRIS')) metode = 'QRIS';
                else if (j.includes('DEBIT')) metode = 'Debit';
            } else if (s.card && s.card > 0) {
                metode = 'Debit/Credit';
            }
            
            return {
                no_fak: s.no_fak,
                tgl_f: s.tgl_f,
                jum: ChartsManager.formatRupiah(s.jum),
                cash: ChartsManager.formatRupiah(s.cash),
                metode: metode,
                kembali: ChartsManager.formatRupiah(s.kembali),
                member: s.member || '-',
                kd_store: s.kd_store
            };
        });
        
        saleTable.clear();
        saleTable.rows.add(formattedData);
        saleTable.draw();
    }
    
    function updateMemberTable(data) {
        const formattedData = data.map(m => ({
            kode_member: m.kode_member,
            nama_member: m.nama_member,
            no_kartu: m.no_kartu,
            alamat: (m.alamat || '').substring(0, 50),
            telpon: m.telpon,
            point: m.point,
            f_aktif: m.f_aktif
        }));
        
        memberTable.clear();
        memberTable.rows.add(formattedData);
        memberTable.draw();
    }
    
    function updateProductTable(data) {
        const formattedData = data.map(p => ({
            plu: p.plu,
            descp: p.descp,
            kategori: p.kategori,
            price1: ChartsManager.formatRupiah(p.price1),
            m_price: ChartsManager.formatRupiah(p.m_price),
            ppn: p.ppn == 1 ? "Ya" : "Tidak"
        }));
        
        productTable.clear();
        productTable.rows.add(formattedData);
        productTable.draw();
    }
    
    function updateEodTable(data) {
        const formattedData = data.map(e => ({
            kd_ksr: e.kd_ksr,
            date_ksr: e.date_ksr,
            ip_kasir: e.ip_kasir,
            pakai: e.pakai == 2 ? "Selesai EOD" : "Proses"
        }));
        
        eodTable.clear();
        eodTable.rows.add(formattedData);
        eodTable.draw();
    }
    
    function updateProfitLossUI(plData) {
        $('#totalRevenue').text(ChartsManager.formatRupiah(plData.totalRevenue));
        $('#totalCost').text(ChartsManager.formatRupiah(plData.totalHPP));
        $('#totalProfit').text(ChartsManager.formatRupiah(plData.totalProfit));
        
        ChartsManager.updateProfitLossChart(
            plData.totalRevenue,
            plData.totalHPP,
            plData.totalProfit
        );
        
        const formattedData = plData.products.map(p => ({
            plu: p.plu,
            name: p.name,
            category: p.category,
            qty: p.qty,
            revenue: ChartsManager.formatRupiah(p.revenue),
            hpp: ChartsManager.formatRupiah(p.hpp),
            profit: ChartsManager.formatRupiah(p.profit),
            margin: `<span class="${p.margin >= 0 ? 'profit-positive' : 'profit-negative'}">${p.margin}%</span>`
        }));
        
        profitLossTable.clear();
        profitLossTable.rows.add(formattedData);
        profitLossTable.draw();
    }

    // 🚀 FUNGSI BARU: Mengatur render tabel Fraud secara terstruktur
    function updateFraudUI(parsedData) {
        const tbody = document.getElementById('fraudTableBody');
        const totalBadge = document.getElementById('totalAnomali');
        
        // Proteksi jika GuardManager belum dimuat di HTML
        if (typeof GuardManager === 'undefined') {
            if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-warning">Kritikal: GuardManager.js belum dimuat di index.html</td></tr>`;
            return;
        }

        const temuanFraud = GuardManager.analyzeFraud(parsedData);

        if (!tbody || !totalBadge) return; // Mencegah eror jika element HTML tidak ada

        if (temuanFraud.length === 0) {
            totalBadge.className = "badge bg-success";
            totalBadge.innerText = "Aman Bersih";
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-success fw-bold py-4">✅ Hebat! Tidak ditemukan indikasi kecurangan pada data hari ini.</td></tr>`;
        } else {
            totalBadge.className = "badge bg-danger";
            totalBadge.innerText = `${temuanFraud.length} Temuan`;
            
            let htmlRows = '';
            temuanFraud.forEach(item => {
                htmlRows += `
                    <tr>
                        <td class="fw-bold text-secondary">#${item.nota || '-'}</td>
                        <td><span class="badge ${item.badgeColor || 'bg-warning'}">${item.tipe}</span></td>
                        <td class="text-muted">${item.keterangan}</td>
                        <td class="text-center"><span class="text-dark fw-bold">${item.level}</span></td>
                    </tr>
                `;
            });
            tbody.innerHTML = htmlRows;
        }
    }
    
    function showToast(msg, type) {
        const toast = $('#toastMsg');
        $('#toastText').text(msg);
        toast.removeClass('alert-success alert-info');
        
        if (type === 'success') {
            toast.addClass('alert-success');
            $('.toast-content i').attr('class', 'bi bi-check-circle-fill');
        } else {
            toast.addClass('alert-info');
            $('.toast-content i').attr('class', 'bi bi-info-circle-fill');
        }
        
        toast.fadeIn(300);
        setTimeout(() => toast.fadeOut(500), 3000);
    }
    
    // Column definitions
    function getTransColumns() {
        return [
            { data: "no_urut", title: "No" },
            { data: "plu", title: "PLU" },
            { data: "descp", title: "Deskripsi" },
            { data: "kategori", title: "Kategori" },
            { data: "price", title: "Harga" },
            { data: "qty", title: "Qty" },
            { data: "kd_kasir", title: "Kasir" },
            { data: "no_bill", title: "No Bill" },
            { data: "tgl_trs", title: "Tgl" },
            { data: "kd_store", title: "Store" },
            { data: "total", title: "Total" }
        ];
    }
    
    function getSaleColumns() {
        return [
            { data: "no_fak", title: "No Faktur" },
            { data: "tgl_f", title: "Tgl" },
            { data: "jum", title: "Total Jual" },
            { data: "cash", title: "Cash" },
            { data: "metode", title: "Metode" },
            { data: "kembali", title: "Kembali" },
            { data: "member", title: "Member" },
            { data: "kd_store", title: "Store" }
        ];
    }
    
    function getMemberColumns() {
        return [
            { data: "kode_member", title: "Kode Member" },
            { data: "nama_member", title: "Nama" },
            { data: "no_kartu", title: "No Kartu" },
            { data: "alamat", title: "Alamat" },
            { data: "telpon", title: "Telpon" },
            { data: "point", title: "Poin" },
            { data: "f_aktif", title: "Aktif" }
        ];
    }
    
    function getProductColumns() {
        return [
            { data: "plu", title: "PLU" },
            { data: "descp", title: "Deskripsi" },
            { data: "kategori", title: "Kategori" },
            { data: "price1", title: "Harga Jual" },
            { data: "m_price", title: "Harga Beli" },
            { data: "ppn", title: "PPN" }
        ];
    }
    
    function getEodColumns() {
        return [
            { data: "kd_ksr", title: "Kode Kasir" },
            { data: "date_ksr", title: "Tanggal" },
            { data: "ip_kasir", title: "IP Kasir" },
            { data: "pakai", title: "Status" }
        ];
    }
    
    function getProfitLossColumns() {
        return [
            { data: "plu", title: "PLU" },
            { data: "name", title: "Nama Produk" },
            { data: "category", title: "Kategori" },
            { data: "qty", title: "QTY Terjual" },
            { data: "revenue", title: "Total Penjualan" },
            { data: "hpp", title: "HPP Total" },
            { data: "profit", title: "Laba Kotor" },
            { data: "margin", title: "Margin" }
        ];
    }
});
