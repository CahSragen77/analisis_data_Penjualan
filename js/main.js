// ======================= MAIN APPLICATION =======================
let globalData = null;
let profitLossTable = null;
let currentPLData = null;

// Format Rupiah (global function)
function formatRupiah(val) {
    if (val === undefined || val === null) return 'Rp 0';
    let num = parseFloat(val);
    if (isNaN(num)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(num);
}

// Show Toast
function showToast(msg, type) {
    const toast = $('#toastMsg');
    $('#toastText').text(msg);
    toast.removeClass('alert-success alert-info alert-warning');
    if (type === 'success') toast.addClass('alert-success');
    else if (type === 'warning') toast.addClass('alert-warning');
    else toast.addClass('alert-info');
    toast.fadeIn(300);
    setTimeout(() => toast.fadeOut(500), 3000);
}

// ======================= PROFIT LOSS FUNCTIONS =======================
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

function updateProfitLossUIFull(plData) {
    if (!plData) return;
    
    currentPLData = plData;
    
    const grossMarginRupiah = plData.totalRevenue - plData.totalHPP;
    const grossMarginPercent = plData.totalRevenue > 0 ? (grossMarginRupiah / plData.totalRevenue) * 100 : 0;
    const netMarginPercent = plData.totalRevenue > 0 ? (plData.totalProfit / plData.totalRevenue) * 100 : 0;
    const avgMargin = plData.products.length > 0 
        ? plData.products.reduce((sum, p) => sum + parseFloat(p.margin), 0) / plData.products.length 
        : 0;
    
    // Update margin cards
    $('#grossMarginPercent').html(`${grossMarginPercent.toFixed(2)}%`);
    $('#grossMarginRupiah').html(`<strong>${formatRupiah(grossMarginRupiah)}</strong>`);
    $('#netMarginPercent').html(`${netMarginPercent.toFixed(2)}%`);
    $('#netMarginRupiah').html(`<strong>${formatRupiah(plData.totalProfit)}</strong>`);
    $('#avgMargin').text(`${avgMargin.toFixed(1)}%`);
    
    // Update margin bars
    $('#grossMarginBar').css('width', `${Math.min(grossMarginPercent, 100)}%`);
    $('#netMarginBar').css('width', `${Math.min(netMarginPercent, 100)}%`);
    
    // Update summary cards
    $('#totalRevenue').text(formatRupiah(plData.totalRevenue));
    $('#totalCost').text(formatRupiah(plData.totalHPP));
    $('#totalProfit').text(formatRupiah(plData.totalProfit));
    
    // Update chart
    if (ChartsManager && ChartsManager.updateProfitLossChartWithMargin) {
        ChartsManager.updateProfitLossChartWithMargin(
            plData.totalRevenue, plData.totalHPP, plData.totalProfit,
            grossMarginPercent, netMarginPercent
        );
    } else if (ChartsManager && ChartsManager.updateProfitLossChart) {
        ChartsManager.updateProfitLossChart(plData.totalRevenue, plData.totalHPP, plData.totalProfit);
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

// ======================= ANALISIS LANJUTAN =======================
function addDateFilter() {
    const filterHtml = `
        <div class="date-filter-bar mb-4 p-3 bg-white rounded-3 shadow-sm">
            <div class="row align-items-center">
                <div class="col-md-3"><label class="fw-bold"><i class="bi bi-calendar-range"></i> Periode Analisis</label></div>
                <div class="col-md-4"><input type="date" id="startDate" class="form-control"></div>
                <div class="col-md-4"><input type="date" id="endDate" class="form-control"></div>
                <div class="col-md-1"><button id="applyFilter" class="btn btn-primary btn-sm w-100">Terapkan</button></div>
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

function updateTopBottomProducts(data) {
    const productSales = new Map();
    data.c_trans.forEach(trans => {
        const plu = trans.plu;
        if (!plu) return;
        const revenue = (trans.price || 0) * (trans.qty || 0);
        if (!productSales.has(plu)) {
            productSales.set(plu, { name: trans.descp || plu, qty: 0, revenue: 0 });
        }
        const p = productSales.get(plu);
        p.qty += (trans.qty || 0);
        p.revenue += revenue;
    });
    
    const products = Array.from(productSales.values()).sort((a,b) => b.revenue - a.revenue);
    const top5 = products.slice(0,5);
    const bottom5 = products.filter(p => p.revenue > 0).slice(-5).reverse();
    
    let topHtml = '';
    top5.forEach((p, i) => {
        topHtml += `<div class="d-flex justify-content-between align-items-center mb-2"><div><span class="badge bg-primary me-2">#${i+1}</span><strong>${p.name.substring(0,35)}</strong><br><small>Qty: ${p.qty.toLocaleString()}</small></div><div class="text-end fw-bold text-success">${formatRupiah(p.revenue)}</div></div>`;
    });
    $('#topProductsList').html(topHtml || '<p class="text-muted">Belum ada data</p>');
    
    let bottomHtml = '';
    bottom5.forEach((p, i) => {
        bottomHtml += `<div class="d-flex justify-content-between align-items-center mb-2"><div><span class="badge bg-danger me-2">#${i+1}</span><strong>${p.name.substring(0,35)}</strong><br><small>Qty: ${p.qty.toLocaleString()}</small></div><div class="text-end fw-bold text-danger">${formatRupiah(p.revenue)}</div></div>`;
    });
    $('#bottomProductsList').html(bottomHtml || '<p class="text-muted">Semua produk terjual dengan baik</p>');
}

function updateHourlyAnalysis(transactions) {
    const hourlyData = new Array(24).fill(0);
    transactions.forEach(trans => {
        if (trans.tgl_trs) {
            const hour = new Date(trans.tgl_trs).getHours();
            if (!isNaN(hour)) hourlyData[hour]++;
        }
    });
    
    const maxHour = hourlyData.indexOf(Math.max(...hourlyData));
    const minHour = hourlyData.findIndex((val, idx) => val > 0 && idx === hourlyData.lastIndexOf(Math.min(...hourlyData.filter(v => v > 0))));
    const avgPerHour = (transactions.length / 24).toFixed(1);
    
    $('#peakHour').text(`${maxHour}:00 - ${maxHour+1}:00`);
    $('#peakHourCount').text(`${hourlyData[maxHour]} transaksi`);
    $('#slowHour').text(minHour >= 0 ? `${minHour}:00 - ${minHour+1}:00` : '-');
    $('#slowHourCount').text(minHour >= 0 ? `${hourlyData[minHour]} transaksi` : '0');
    $('#avgHourly').text(`${avgPerHour} transaksi/jam`);
    
    const ctx = document.getElementById('hourlyChart');
    if (ctx) {
        if (window.hourlyChart) window.hourlyChart.destroy();
        window.hourlyChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: [...Array(24).keys()].map(h => `${h}:00`), datasets: [{ label: 'Transaksi', data: hourlyData, backgroundColor: '#667eea', borderRadius: 5 }] },
            options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8 } } } }
        });
    }
}

function updateMemberAnalysis(data) {
    const memberSales = data.c_tsale.filter(s => s.member && s.member !== '-');
    const nonMemberSales = data.c_tsale.filter(s => !s.member || s.member === '-');
    const memberRevenue = memberSales.reduce((sum, s) => sum + (s.jum || 0), 0);
    const nonMemberRevenue = nonMemberSales.reduce((sum, s) => sum + (s.jum || 0), 0);
    const memberPercent = data.c_tsale.length > 0 ? (memberSales.length / data.c_tsale.length * 100).toFixed(1) : 0;
    
    $('#memberCount').text(memberSales.length.toLocaleString());
    $('#memberRevenue').text(formatRupiah(memberRevenue));
    $('#memberPercent').text(`${memberPercent}%`);
    $('#nonMemberCount').text(nonMemberSales.length.toLocaleString());
    $('#nonMemberRevenue').text(formatRupiah(nonMemberRevenue));
    $('#nonMemberPercent').text(`${(100 - memberPercent).toFixed(1)}%`);
    
    const ctx = document.getElementById('memberChart');
    if (ctx) {
        if (window.memberChart) window.memberChart.destroy();
        window.memberChart = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: ['Member', 'Non-Member'], datasets: [{ data: [memberRevenue, nonMemberRevenue], backgroundColor: ['#10b981', '#6c757d'] }] },
            options: { responsive: true }
        });
    }
}

function updateCashierAnalysis(data) {
    const cashierMap = new Map();
    data.c_tsale.forEach(sale => {
        const kasir = sale.kd_kasir || 'Unknown';
        if (!cashierMap.has(kasir)) cashierMap.set(kasir, { count: 0, revenue: 0 });
        const rec = cashierMap.get(kasir);
        rec.count++;
        rec.revenue += sale.jum || 0;
    });
    
    let cashierHtml = '';
    const maxRevenue = cashierMap.size > 0 ? Math.max(...Array.from(cashierMap.values()).map(v => v.revenue)) : 1;
    Array.from(cashierMap.entries()).sort((a,b) => b[1].revenue - a[1].revenue).forEach(([name, d]) => {
        cashierHtml += `<tr><td><i class="bi bi-person-circle"></i> ${name}</td><td>${d.count.toLocaleString()}</td><td class="text-success fw-bold">${formatRupiah(d.revenue)}</td><td><div class="progress" style="height: 6px;"><div class="progress-bar bg-success" style="width: ${(d.revenue / maxRevenue * 100)}%"></div></div></td></tr>`;
    });
    $('#cashierTableBody').html(cashierHtml || '<tr><td colspan="4" class="text-center">Belum ada data</td></tr>');
}

function checkAlerts(data) {
    const alerts = [];
    const avgTransaction = data.c_tsale.reduce((sum, s) => sum + (s.jum || 0), 0) / (data.c_tsale.length || 1);
    if (avgTransaction < 50000) alerts.push({ type: 'warning', message: '⚠️ Rata-rata transaksi rendah (< Rp 50.000)', icon: 'bi-arrow-down-circle' });
    
    const today = new Date().toISOString().split('T')[0];
    const salesToday = data.c_tsale.filter(s => s.tgl_f === today);
    if (salesToday.length === 0 && data.c_tsale.length > 0) alerts.push({ type: 'danger', message: '📉 Belum ada penjualan hari ini!', icon: 'bi-graph-down' });
    
    $('#alertContainer').html(alerts.length ? alerts.map(a => `<div class="alert alert-${a.type} alert-dismissible fade show mb-2"><i class="bi ${a.icon} me-2"></i>${a.message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button></div>`).join('') : '<div class="alert alert-success"><i class="bi bi-check-circle"></i> Semua indikator normal ✅</div>');
}

// ======================= COLUMN DEFINITIONS =======================
function getTransColumns() {
    return [
        { data: "no_urut", title: "No" }, { data: "plu", title: "PLU" }, { data: "descp", title: "Deskripsi" },
        { data: "kategori", title: "Kategori" }, { data: "price", title: "Harga" }, { data: "qty", title: "Qty" },
        { data: "kd_kasir", title: "Kasir" }, { data: "no_bill", title: "No Bill" }, { data: "tgl_trs", title: "Tgl" },
        { data: "kd_store", title: "Store" }, { data: "total", title: "Total" }
    ];
}

function getSaleColumns() {
    return [
        { data: "no_fak", title: "No Faktur" }, { data: "tgl_f", title: "Tgl" }, { data: "jum", title: "Total Jual" },
        { data: "cash", title: "Cash" }, { data: "metode", title: "Metode" }, { data: "kembali", title: "Kembali" },
        { data: "member", title: "Member" }, { data: "kd_store", title: "Store" }
    ];
}

function getMemberColumns() {
    return [
        { data: "kode_member", title: "Kode Member" }, { data: "nama_member", title: "Nama" },
        { data: "no_kartu", title: "No Kartu" }, { data: "alamat", title: "Alamat" },
        { data: "telpon", title: "Telpon" }, { data: "point", title: "Poin" }, { data: "f_aktif", title: "Aktif" }
    ];
}

function getProductColumns() {
    return [
        { data: "plu", title: "PLU" }, { data: "descp", title: "Deskripsi" }, { data: "kategori", title: "Kategori" },
        { data: "price1", title: "Harga Jual" }, { data: "m_price", title: "Harga Beli" }, { data: "ppn", title: "PPN" }
    ];
}

function getEodColumns() {
    return [
        { data: "kd_ksr", title: "Kode Kasir" }, { data: "date_ksr", title: "Tanggal" },
        { data: "ip_kasir", title: "IP Kasir" }, { data: "pakai", title: "Status" }
    ];
}

// ======================= MAIN DOCUMENT READY =======================
$(document).ready(function() {
    // Initialize DataTables
    const transTable = $('#transTable').DataTable({ data: [], columns: getTransColumns(), pageLength: 15, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' } });
    const saleTable = $('#saleTable').DataTable({ data: [], columns: getSaleColumns(), pageLength: 10, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' } });
    const memberTable = $('#memberTable').DataTable({ data: [], columns: getMemberColumns(), pageLength: 10, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' } });
    const productTable = $('#productTable').DataTable({ data: [], columns: getProductColumns(), pageLength: 10, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' } });
    const eodTable = $('#eodTable').DataTable({ data: [], columns: getEodColumns(), pageLength: 10, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' } });
    const summaryTable = $('#summaryTable').DataTable({ pageLength: 10, language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' } });
    
    // Add date filter
    addDateFilter();
    
    // File upload handler
    $('#sqlUpload').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            showToast(`Memproses ${file.name}...`, 'info');
            setTimeout(() => {
                const parsed = SQLParser.parseSQLCopy(e.target.result);
                globalData = parsed;
                
                // Update UI
                $('#statTrans').text(parsed.c_trans.length.toLocaleString());
                $('#statSale').text(parsed.c_tsale.length.toLocaleString());
                $('#statMember').text(parsed.m_cust.length.toLocaleString());
                $('#statProd').text(parsed.m_loader.length.toLocaleString());
                
                if (parsed.c_tsale.length > 0) {
                    const summaryRows = ChartsManager.generateSummaryAndCharts(parsed.c_tsale);
                    summaryTable.clear();
                    summaryRows.forEach(r => {
                        summaryTable.row.add([r.tanggal, r.total_trx.toLocaleString(), ChartsManager.formatRupiah(r.nominal), ChartsManager.formatRupiah(r.cash), ChartsManager.formatRupiah(r.qris), ChartsManager.formatRupiah(r.debit), ChartsManager.formatRupiah(r.avg)]);
                    });
                    summaryTable.draw();
                }
                
                // Update detail tables
                transTable.clear(); transTable.rows.add(parsed.c_trans.map(t => ({ no_urut: t.no_urut, plu: t.plu, descp: t.descp || '-', kategori: t.kategori, price: ChartsManager.formatRupiah(t.price), qty: t.qty, kd_kasir: t.kd_kasir, no_bill: t.no_bill, tgl_trs: t.tgl_trs, kd_store: t.kd_store, total: ChartsManager.formatRupiah((t.price||0)*(t.qty||0)) }))).draw();
                
                saleTable.clear(); saleTable.rows.add(parsed.c_tsale.map(s => { let metode = 'Cash'; if (s.j_card) { let j = s.j_card.toString().toUpperCase(); if (j.includes('QRIS')) metode = 'QRIS'; else if (j.includes('DEBIT')) metode = 'Debit'; } else if (s.card && s.card > 0) metode = 'Debit/Credit'; return { no_fak: s.no_fak, tgl_f: s.tgl_f, jum: ChartsManager.formatRupiah(s.jum), cash: ChartsManager.formatRupiah(s.cash), metode: metode, kembali: ChartsManager.formatRupiah(s.kembali), member: s.member || '-', kd_store: s.kd_store }; })).draw();
                
                memberTable.clear(); memberTable.rows.add(parsed.m_cust.map(m => ({ kode_member: m.kode_member, nama_member: m.nama_member, no_kartu: m.no_kartu, alamat: (m.alamat || '').substring(0,50), telpon: m.telpon, point: m.point, f_aktif: m.f_aktif }))).draw();
                
                productTable.clear(); productTable.rows.add(parsed.m_loader.map(p => ({ plu: p.plu, descp: p.descp, kategori: p.kategori, price1: ChartsManager.formatRupiah(p.price1), m_price: ChartsManager.formatRupiah(p.m_price), ppn: p.ppn == 1 ? "Ya" : "Tidak" }))).draw();
                
                eodTable.clear(); eodTable.rows.add(parsed.cek_eod.map(e => ({ kd_ksr: e.kd_ksr, date_ksr: e.date_ksr, ip_kasir: e.ip_kasir, pakai: e.pakai == 2 ? "Selesai EOD" : "Proses" }))).draw();
                
                // Update advanced analytics
                updateTopBottomProducts(parsed);
                updateHourlyAnalysis(parsed.c_trans);
                updateMemberAnalysis(parsed);
                updateCashierAnalysis(parsed);
                checkAlerts(parsed);
                
                // Update profit loss
                if (parsed.c_trans.length > 0 && parsed.m_loader.length > 0) {
                    const plData = SQLParser.calculateProfitLoss(parsed);
                    updateProfitLossUIFull(plData);
                }
                
                $('#exportAllBtn').prop('disabled', false);
                showToast(`✅ Berhasil memuat: ${parsed.c_trans.length} transaksi, ${parsed.c_tsale.length} penjualan`, 'success');
            }, 100);
        };
        reader.readAsText(file, 'UTF-8');
    });
    
    // Export buttons
    $('#exportAllBtn').on('click', () => { if (globalData) { ExportManager.exportToExcel(globalData); showToast('Ekspor data berhasil!', 'success'); } });
    $('#exportProfitBtn').on('click', () => { if (currentPLData && ExportManager && ExportManager.exportProfitLoss) { ExportManager.exportProfitLoss(currentPLData); showToast('Ekspor Laba-Rugi berhasil!', 'success'); } });
    
    // Print buttons
    $('#printProfitLossBtn').on('click', printProfitLossReport);
    $('#printMarginReportBtn').on('click', () => { if (currentPLData) printProfitLossReport(); });
    
    // Trigger file upload label
    $('label[for="sqlUpload"]').click(() => $('#sqlUpload').click());
});
