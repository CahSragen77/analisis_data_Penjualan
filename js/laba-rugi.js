// Laba-Rugi specific JavaScript
$(document).ready(function() {
    let profitLossTable = null;
    
    // Initialize DataTable dengan 9 kolom (LENGKAP)
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
            { data: "contribution" }  // ← Tambahkan kolom ke-9
        ]
    });
    
    // Load data from localStorage
    loadProfitLossData();
    
    $('#exportProfitBtn').on('click', function() {
        const data = getSharedData();
        if (data) {
            const plData = SQLParser.calculateProfitLoss(data);
            if (typeof ExportManager !== 'undefined' && ExportManager.exportProfitLoss) {
                ExportManager.exportProfitLoss(plData);
                showToast('Ekspor Laba-Rugi berhasil!', 'success');
            } else {
                showToast('Fitur export belum tersedia', 'warning');
            }
        }
    });
    
    function loadProfitLossData() {
        const data = getSharedData();
        
        if (data && data.c_trans && data.c_trans.length > 0 && data.m_loader && data.m_loader.length > 0) {
            const plData = SQLParser.calculateProfitLoss(data);
            updateProfitLossUI(plData);
            $('#exportProfitBtn').prop('disabled', false);
        } else {
            $('#totalRevenue').text('Rp 0');
            $('#totalCost').text('Rp 0');
            $('#totalProfit').text('Rp 0');
            $('#grossMarginPercent').text('0%');
            $('#grossMarginRupiah').text('Rp 0');
            $('#netMarginPercent').text('0%');
            $('#netMarginRupiah').text('Rp 0');
            $('#avgMargin').text('0%');
            $('#grossMarginBar').css('width', '0%');
            $('#netMarginBar').css('width', '0%');
            showToast('Belum ada data. Silakan upload SQL di halaman Dashboard terlebih dahulu.', 'info');
        }
    }
    
    function updateProfitLossUI(plData) {
        if (!plData) return;
        
        // Hitung margin
        const grossMarginRupiah = plData.totalRevenue - plData.totalHPP;
        const grossMarginPercent = plData.totalRevenue > 0 ? (grossMarginRupiah / plData.totalRevenue) * 100 : 0;
        const netMarginPercent = plData.totalRevenue > 0 ? (plData.totalProfit / plData.totalRevenue) * 100 : 0;
        const avgMargin = plData.products.length > 0 
            ? plData.products.reduce((sum, p) => sum + parseFloat(p.margin), 0) / plData.products.length 
            : 0;
        
        // Update summary cards
        $('#totalRevenue').text(ChartsManager.formatRupiah(plData.totalRevenue));
        $('#totalCost').text(ChartsManager.formatRupiah(plData.totalHPP));
        $('#totalProfit').text(ChartsManager.formatRupiah(plData.totalProfit));
        
        // Update margin cards
        $('#grossMarginPercent').text(grossMarginPercent.toFixed(2) + '%');
        $('#grossMarginRupiah').text(ChartsManager.formatRupiah(grossMarginRupiah));
        $('#netMarginPercent').text(netMarginPercent.toFixed(2) + '%');
        $('#netMarginRupiah').text(ChartsManager.formatRupiah(plData.totalProfit));
        $('#avgMargin').text(avgMargin.toFixed(1) + '%');
        
        // Update margin bars
        $('#grossMarginBar').css('width', Math.min(grossMarginPercent, 100) + '%');
        $('#netMarginBar').css('width', Math.min(netMarginPercent, 100) + '%');
        
        // Update chart (gunakan fungsi yang sesuai)
        if (ChartsManager.updateProfitLossChartWithMargin) {
            ChartsManager.updateProfitLossChartWithMargin(
                plData.totalRevenue, 
                plData.totalHPP, 
                plData.totalProfit,
                grossMarginPercent,
                netMarginPercent
            );
        } else if (ChartsManager.updateProfitLossChart) {
            ChartsManager.updateProfitLossChart(
                plData.totalRevenue,
                plData.totalHPP,
                plData.totalProfit
            );
        }
        
        // Update table dengan 9 kolom (termasuk kontribusi)
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
                revenue: ChartsManager.formatRupiah(p.revenue),
                hpp: ChartsManager.formatRupiah(p.hpp),
                profit: `<span class="${marginClass}">${ChartsManager.formatRupiah(p.profit)}</span>`,
                margin: `<span class="${marginClass}">${p.margin}%</span>`,
                contribution: `<span class="${marginClass}">${contribution.toFixed(1)}%</span>`
            });
        });
        profitLossTable.draw();
    }
    
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
});
