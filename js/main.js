// ======================= FITUR LABA-RUGI & MARGIN =======================
let profitLossTable = null;
let currentPLData = null;

// Initialize Profit Loss Table
function initProfitLossTable() {
    if (!$.fn.DataTable.isDataTable('#profitLossTable')) {
        profitLossTable = $('#profitLossTable').DataTable({
            pageLength: 15,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' },
            columns: [
                { data: "plu" },
                { data: "name" },
                { data: "category" },
                { data: "qty" },
                { data: "revenue" },
                { data: "hpp" },
                { data: "profit" },
                { data: "margin" },
                { data: "contribution" }
            ],
            order: [[7, 'desc']]
        });
    }
}

// Update Profit Loss UI
function updateProfitLossUI(plData) {
    if (!plData) return;
    
    currentPLData = plData;
    
    const grossMarginRupiah = plData.totalRevenue - plData.totalHPP;
    const grossMarginPercent = plData.totalRevenue > 0 ? (grossMarginRupiah / plData.totalRevenue) * 100 : 0;
    const netMarginPercent = plData.totalRevenue > 0 ? (plData.totalProfit / plData.totalRevenue) * 100 : 0;
    
    // Update margin cards
    $('#grossMarginPercent').html(`${grossMarginPercent.toFixed(2)}%`);
    $('#grossMarginRupiah').html(`<strong>${formatRupiah(grossMarginRupiah)}</strong>`);
    $('#netMarginPercent').html(`${netMarginPercent.toFixed(2)}%`);
    $('#netMarginRupiah').html(`<strong>${formatRupiah(plData.totalProfit)}</strong>`);
    
    // Update margin bars
    $('#grossMarginBar').css('width', `${Math.min(grossMarginPercent, 100)}%`);
    $('#netMarginBar').css('width', `${Math.min(netMarginPercent, 100)}%`);
    
    // Update summary cards
    $('#totalRevenue').text(formatRupiah(plData.totalRevenue));
    $('#totalCost').text(formatRupiah(plData.totalHPP));
    $('#totalProfit').text(formatRupiah(plData.totalProfit));
    
    const avgMargin = plData.products.reduce((sum, p) => sum + parseFloat(p.margin), 0) / plData.products.length;
    $('#avgMargin').text(`${avgMargin.toFixed(1)}%`);
    
    // Update chart (akan ditambahkan di charts.js)
    if (typeof ChartsManager !== 'undefined' && ChartsManager.updateProfitLossChartWithMargin) {
        ChartsManager.updateProfitLossChartWithMargin(
            plData.totalRevenue, 
            plData.totalHPP, 
            plData.totalProfit,
            grossMarginPercent,
            netMarginPercent
        );
    }
    
    // Update table
    if (!profitLossTable) initProfitLossTable();
    profitLossTable.clear();
    
    const totalProfitAll = plData.totalProfit;
    plData.products.forEach(p => {
        const marginValue = parseFloat(p.margin);
        const marginClass = marginValue >= 0 ? 'profit-positive' : 'profit-negative';
        const contribution = totalProfitAll > 0 ? (p.profit / totalProfitAll) * 100 : 0;
        
        profitLossTable.row.add({
            plu: p.plu,
            name: p.name,
            category: p.category,
            qty: p.qty.toLocaleString(),
            revenue: formatRupiah(p.revenue),
            hpp: formatRupiah(p.hpp),
            profit: `<span class="${marginClass}">${formatRupiah(p.profit)}</span>`,
            margin: `<span class="${marginClass}">${p.margin}%</span>`,
            contribution: `<span class="${marginClass}">${contribution.toFixed(1)}%</span>`
        });
    });
    profitLossTable.draw();
    
    $('#exportProfitBtn').prop('disabled', false);
}

// Print functions
function printProfitLossReport() {
    if (!currentPLData) return;
    
    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleString('id-ID');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Laporan Laba-Rugi - AmandaMart</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; }
                .summary-cards { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 20px; }
                .card { border: 1px solid #ddd; border-radius: 10px; padding: 15px; flex: 1; text-align: center; }
                .margin-section { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background: #667eea; color: white; }
                .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; }
                @media print { body { padding: 0; } }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>AmandaMart</h1>
                <h3>Laporan Laba-Rugi</h3>
                <p>${currentDate}</p>
            </div>
            <div class="summary-cards">
                <div class="card"><h4>Total Pendapatan</h4><h3>${formatRupiah(currentPLData.totalRevenue)}</h3></div>
                <div class="card"><h4>Total HPP</h4><h3>${formatRupiah(currentPLData.totalHPP)}</h3></div>
                <div class="card"><h4>Laba Bersih</h4><h3>${formatRupiah(currentPLData.totalProfit)}</h3></div>
            </div>
            <div class="margin-section">
                <h4>Analisis Margin</h4>
                <div style="display: flex; justify-content: space-between;">
                    <div><p>Margin Kotor</p><h3>${$('#grossMarginPercent').text()}</h3><p>${$('#grossMarginRupiah').text()}</p></div>
                    <div><p>Margin Bersih</p><h3>${$('#netMarginPercent').text()}</h3><p>${$('#netMarginRupiah').text()}</p></div>
                    <div><p>Rata-rata Margin</p><h3>${$('#avgMargin').text()}</h3></div>
                </div>
            </div>
            <h4>Detail Produk (Top 20)</h4>
            <table><thead><tr><th>Produk</th><th>Kategori</th><th>QTY</th><th>Penjualan</th><th>HPP</th><th>Laba</th><th>Margin</th></tr></thead>
            <tbody>${currentPLData.products.slice(0,20).map(p => `<tr><td>${p.name}</td><td>${p.category}</td><td>${p.qty.toLocaleString()}</td><td>${formatRupiah(p.revenue)}</td><td>${formatRupiah(p.hpp)}</td><td>${formatRupiah(p.profit)}</td><td>${p.margin}%</td></tr>`).join('')}</tbody>
            </table>
            <div class="footer"><p>Dicetak dari AmandaMart SQL Analyzer pada ${currentDate}</p></div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
    printWindow.print();
}

// Event handlers for print buttons
$('#printProfitLossBtn').on('click', printProfitLossReport);
$('#printMarginReportBtn').on('click', function() {
    if (!currentPLData) return;
    printProfitLossReport(); // Bisa dimodifikasi untuk khusus margin
});

$('#exportProfitBtn').on('click', function() {
    if (currentPLData && typeof ExportManager !== 'undefined') {
        ExportManager.exportProfitLoss(currentPLData);
        showToast('Ekspor Laba-Rugi berhasil!', 'success');
    }
});
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
    }
    
    function updateSummaryTable(rows) {
        const tbody = $('#summaryBody');
        tbody.empty();
        
        if (rows.length === 0) {
            tbody.html('<tr><td colspan="7" class="text-center text-muted">Tidak ada data penjualan</td></tr>');
        } else {
            rows.forEach(r => {
                tbody.append(`
                    <tr>
                        <td><strong>${r.tanggal}</strong></td>
                        <td>${r.total_trx.toLocaleString()}</td>
                        <td class="text-success fw-bold">${ChartsManager.formatRupiah(r.nominal)}</td>
                        <td>${ChartsManager.formatRupiah(r.cash)}</td>
                        <td>${ChartsManager.formatRupiah(r.qris)}</td>
                        <td>${ChartsManager.formatRupiah(r.debit)}</td>
                        <td>${ChartsManager.formatRupiah(r.avg)}</td>
                    </tr>
                `);
            });
        }
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
        // Update summary cards
        $('#totalRevenue').text(ChartsManager.formatRupiah(plData.totalRevenue));
        $('#totalCost').text(ChartsManager.formatRupiah(plData.totalHPP));
        $('#totalProfit').text(ChartsManager.formatRupiah(plData.totalProfit));
        
        // Update profit loss chart
        ChartsManager.updateProfitLossChart(
            plData.totalRevenue,
            plData.totalHPP,
            plData.totalProfit
        );
        
        // Update profit loss table
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


// ======================= FITUR ANALISIS LANJUTAN =======================

// 1. FILTER TANGGAL (Date Range Picker)
function addDateFilter() {
    const filterHtml = `
        <div class="date-filter-bar mb-4 p-3 bg-white rounded-3 shadow-sm">
            <div class="row align-items-center">
                <div class="col-md-3">
                    <label class="fw-bold"><i class="bi bi-calendar-range"></i> Periode Analisis</label>
                </div>
                <div class="col-md-4">
                    <input type="date" id="startDate" class="form-control" placeholder="Tanggal Mulai">
                </div>
                <div class="col-md-4">
                    <input type="date" id="endDate" class="form-control" placeholder="Tanggal Akhir">
                </div>
                <div class="col-md-1">
                    <button id="applyFilter" class="btn btn-primary btn-sm w-100">Terapkan</button>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-12">
                    <button class="btn btn-sm btn-outline-secondary me-2 quick-filter" data-days="7">7 Hari</button>
                    <button class="btn btn-sm btn-outline-secondary me-2 quick-filter" data-days="30">30 Hari</button>
                    <button class="btn btn-sm btn-outline-secondary me-2 quick-filter" data-days="90">90 Hari</button>
                    <button class="btn btn-sm btn-outline-secondary quick-filter" data-days="365">1 Tahun</button>
                </div>
            </div>
        </div>
    `;
    $('.header-section').after(filterHtml);
    
    // Quick filter event
    $('.quick-filter').on('click', function() {
        const days = $(this).data('days');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);
        $('#startDate').val(startDate.toISOString().split('T')[0]);
        $('#endDate').val(endDate.toISOString().split('T')[0]);
        $('#applyFilter').click();
    });
}

// 2. TOP & BOTTOM PRODUK
function updateTopBottomProducts(data) {
    // Hitung penjualan per produk
    const productSales = new Map();
    data.c_trans.forEach(trans => {
        const plu = trans.plu;
        if (!plu) return;
        const qty = trans.qty || 0;
        const revenue = (trans.price || 0) * qty;
        
        if (!productSales.has(plu)) {
            productSales.set(plu, {
                plu: plu,
                name: trans.descp || '-',
                qty: 0,
                revenue: 0
            });
        }
        const p = productSales.get(plu);
        p.qty += qty;
        p.revenue += revenue;
    });
    
    const products = Array.from(productSales.values()).sort((a,b) => b.revenue - a.revenue);
    const top5 = products.slice(0, 5);
    const bottom5 = products.slice(-5).reverse();
    
    // Display Top Products
    let topHtml = '';
    top5.forEach((p, i) => {
        topHtml += `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <span class="badge bg-primary me-2">#${i+1}</span>
                    <strong>${p.name}</strong>
                    <small class="text-muted d-block">Qty: ${p.qty.toLocaleString()}</small>
                </div>
                <div class="text-end">
                    <span class="fw-bold text-success">${formatRupiah(p.revenue)}</span>
                </div>
            </div>
        `;
    });
    $('#topProductsList').html(topHtml || '<p class="text-muted">Belum ada data</p>');
    
    // Display Bottom Products
    let bottomHtml = '';
    bottom5.forEach((p, i) => {
        bottomHtml += `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <span class="badge bg-danger me-2">#${products.length - i}</span>
                    <strong>${p.name}</strong>
                    <small class="text-muted d-block">Qty: ${p.qty.toLocaleString()}</small>
                </div>
                <div class="text-end">
                    <span class="fw-bold text-danger">${formatRupiah(p.revenue)}</span>
                </div>
            </div>
        `;
    });
    $('#bottomProductsList').html(bottomHtml || '<p class="text-muted">Belum ada data</p>');
}

// 3. ANALISIS JAM SIBUK (Hourly Analysis)
function updateHourlyAnalysis(transactions) {
    const hourlyData = new Array(24).fill(0);
    transactions.forEach(trans => {
        if (trans.tgl_trs) {
            const hour = new Date(trans.tgl_trs).getHours();
            hourlyData[hour]++;
        }
    });
    
    const maxHour = hourlyData.indexOf(Math.max(...hourlyData));
    const minHour = hourlyData.indexOf(Math.min(...hourlyData.filter(h => h > 0)));
    const avgPerHour = (transactions.length / 24).toFixed(1);
    
    $('#peakHour').text(`${maxHour}:00 - ${maxHour+1}:00`);
    $('#peakHourCount').text(`${hourlyData[maxHour]} transaksi`);
    $('#slowHour').text(`${minHour}:00 - ${minHour+1}:00`);
    $('#slowHourCount').text(`${hourlyData[minHour] || 0} transaksi`);
    $('#avgHourly').text(`${avgPerHour} transaksi/jam`);
    
    // Hourly chart
    const ctx = document.getElementById('hourlyChart');
    if (ctx && window.hourlyChart) window.hourlyChart.destroy();
    if (ctx) {
        window.hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [...Array(24).keys()].map(h => `${h}:00`),
                datasets: [{
                    label: 'Jumlah Transaksi',
                    data: hourlyData,
                    backgroundColor: '#667eea',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } }
            }
        });
    }
}

// 4. ANALISIS MEMBER vs NON-MEMBER
function updateMemberAnalysis(data) {
    const memberSales = data.c_tsale.filter(s => s.member && s.member !== '-');
    const nonMemberSales = data.c_tsale.filter(s => !s.member || s.member === '-');
    
    const memberRevenue = memberSales.reduce((sum, s) => sum + (s.jum || 0), 0);
    const nonMemberRevenue = nonMemberSales.reduce((sum, s) => sum + (s.jum || 0), 0);
    const memberCount = memberSales.length;
    const nonMemberCount = nonMemberSales.length;
    const memberPercent = data.c_tsale.length > 0 ? (memberCount / data.c_tsale.length * 100).toFixed(1) : 0;
    
    $('#memberCount').text(memberCount.toLocaleString());
    $('#memberRevenue').text(formatRupiah(memberRevenue));
    $('#memberPercent').text(`${memberPercent}%`);
    $('#nonMemberCount').text(nonMemberCount.toLocaleString());
    $('#nonMemberRevenue').text(formatRupiah(nonMemberRevenue));
    $('#nonMemberPercent').text(`${(100 - memberPercent).toFixed(1)}%`);
    
    // Member vs Non-Member Chart
    const ctx = document.getElementById('memberChart');
    if (ctx && window.memberChart) window.memberChart.destroy();
    if (ctx) {
        window.memberChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Member', 'Non-Member'],
                datasets: [{
                    data: [memberRevenue, nonMemberRevenue],
                    backgroundColor: ['#10b981', '#6c757d']
                }]
            },
            options: { responsive: true }
        });
    }
}

// 5. REKAP PER KASIR
function updateCashierAnalysis(data) {
    const cashierMap = new Map();
    data.c_tsale.forEach(sale => {
        const kasir = sale.kd_kasir || 'Unknown';
        if (!cashierMap.has(kasir)) {
            cashierMap.set(kasir, { count: 0, revenue: 0 });
        }
        const rec = cashierMap.get(kasir);
        rec.count++;
        rec.revenue += sale.jum || 0;
    });
    
    let cashierHtml = '';
    Array.from(cashierMap.entries())
        .sort((a,b) => b[1].revenue - a[1].revenue)
        .forEach(([name, data]) => {
            cashierHtml += `
                <tr>
                    <td><i class="bi bi-person-circle"></i> ${name}</td>
                    <td>${data.count.toLocaleString()} transaksi</td>
                    <td class="text-success fw-bold">${formatRupiah(data.revenue)}</td>
                    <td>
                        <div class="progress" style="height: 6px;">
                            <div class="progress-bar bg-success" style="width: ${(data.revenue / cashierMap.values().next().value.revenue * 100)}%"></div>
                        </div>
                    </td>
                </tr>
            `;
        });
    $('#cashierTableBody').html(cashierHtml || '<tr><td colspan="4" class="text-center">Belum ada数据</td></tr>');
}

// 6. Dashboard Warning / Alert
function checkAlerts(data) {
    const alerts = [];
    
    // Average transaction check
    const avgTransaction = data.c_tsale.reduce((sum, s) => sum + (s.jum || 0), 0) / data.c_tsale.length;
    if (avgTransaction < 50000) {
        alerts.push({ type: 'warning', message: '⚠️ Rata-rata transaksi rendah (< Rp 50.000)', icon: 'bi-arrow-down-circle' });
    }
    
    // Low stock simulation (if product quantity < 5)
    const lowStockProducts = data.m_loader.filter(p => (p.stock || 0) < 5);
    if (lowStockProducts.length > 0) {
        alerts.push({ type: 'danger', message: `📦 ${lowStockProducts.length} produk mendekati habis (stok < 5)`, icon: 'bi-exclamation-triangle' });
    }
    
    // No sales today
    const today = new Date().toISOString().split('T')[0];
    const salesToday = data.c_tsale.filter(s => s.tgl_f === today);
    if (salesToday.length === 0 && data.c_tsale.length > 0) {
        alerts.push({ type: 'danger', message: '📉 Belum ada penjualan hari ini!', icon: 'bi-graph-down' });
    }
    
    const alertHtml = alerts.map(a => `
        <div class="alert alert-${a.type} alert-dismissible fade show mb-2" role="alert">
            <i class="bi ${a.icon} me-2"></i>
            ${a.message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `).join('');
    
    $('#alertContainer').html(alertHtml || '<div class="alert alert-success"><i class="bi bi-check-circle"></i> Semua indikator normal ✅</div>');
}
