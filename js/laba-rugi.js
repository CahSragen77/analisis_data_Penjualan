// Laba-Rugi specific JavaScript
$(document).ready(function() {
    let profitLossTable = null;
    
    // Initialize DataTable
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
            { data: "margin" }
        ]
    });
    
    // Load data from localStorage
    loadProfitLossData();
    
    $('#exportProfitBtn').on('click', function() {
        const data = getSharedData();
        if (data) {
            const plData = SQLParser.calculateProfitLoss(data);
            ExportManager.exportProfitLoss(plData);
            showToast('Ekspor Laba-Rugi berhasil!', 'success');
        }
    });
    
    function loadProfitLossData() {
        const data = getSharedData();
        
        if (data && data.c_trans.length > 0 && data.m_loader.length > 0) {
            const plData = SQLParser.calculateProfitLoss(data);
            updateProfitLossUI(plData);
            $('#exportProfitBtn').prop('disabled', false);
        } else {
            showToast('Belum ada data. Silakan upload SQL di halaman Dashboard terlebih dahulu.', 'info');
        }
    }
    
    function updateProfitLossUI(plData) {
        // Update summary cards
        $('#totalRevenue').text(ChartsManager.formatRupiah(plData.totalRevenue));
        $('#totalCost').text(ChartsManager.formatRupiah(plData.totalHPP));
        $('#totalProfit').text(ChartsManager.formatRupiah(plData.totalProfit));
        
        // Update chart
        ChartsManager.updateProfitLossChart(
            plData.totalRevenue,
            plData.totalHPP,
            plData.totalProfit
        );
        
        // Update table
        profitLossTable.clear();
        plData.products.forEach(p => {
            const marginValue = parseFloat(p.margin);
            const marginClass = marginValue >= 0 ? 'profit-positive' : 'profit-negative';
            
            profitLossTable.row.add({
                plu: p.plu,
                name: p.name,
                category: p.category,
                qty: p.qty.toLocaleString(),
                revenue: ChartsManager.formatRupiah(p.revenue),
                hpp: ChartsManager.formatRupiah(p.hpp),
                profit: `<span class="${marginClass}">${ChartsManager.formatRupiah(p.profit)}</span>`,
                margin: `<span class="${marginClass}">${p.margin}%</span>`
            });
        });
        profitLossTable.draw();
    }
    
    function showToast(msg, type) {
        const toast = $('#toastMsg');
        $('#toastText').text(msg);
        toast.fadeIn(300);
        setTimeout(() => toast.fadeOut(500), 3000);
    }
});
