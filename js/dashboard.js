// Dashboard specific JavaScript
$(document).ready(function() {
    let globalData = null;
    
    // DataTables initialization
    const summaryTable = $('#summaryTable').DataTable({
        pageLength: 10,
        language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/id.json' }
    });
    
    // File upload handler
    $('#sqlUpload').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            showToast(`Memproses ${file.name}...`, 'info');
            const parsed = SQLParser.parseSQLCopy(e.target.result);
            globalData = parsed;
            
            // Save to localStorage for laba-rugi page
            saveSharedData(parsed);
            
            updateDashboard(parsed);
            showToast(`✅ Berhasil memuat data!`, 'success');
            $('#exportAllBtn').prop('disabled', false);
        };
        reader.readAsText(file, 'UTF-8');
    });
    
    $('#exportAllBtn').on('click', function() {
        if (globalData) {
            ExportManager.exportToExcel(globalData);
            showToast('Ekspor data berhasil!', 'success');
        }
    });
    
    // Check for existing data on page load
    const existingData = getSharedData();
    if (existingData) {
        globalData = existingData;
        updateDashboard(existingData);
        $('#exportAllBtn').prop('disabled', false);
        showToast('Data ditemukan, siap dianalisis!', 'info');
    }
    
    function updateDashboard(data) {
        // Update stats
        $('#statTrans').text(data.c_trans.length.toLocaleString());
        $('#statSale').text(data.c_tsale.length.toLocaleString());
        $('#statMember').text(data.m_cust.length.toLocaleString());
        $('#statProd').text(data.m_loader.length.toLocaleString());
        
        // Update charts and summary
        if (data.c_tsale.length > 0) {
            const summaryRows = ChartsManager.generateSummaryAndCharts(data.c_tsale);
            updateSummaryTable(summaryRows);
        }
    }
    
    function updateSummaryTable(rows) {
        summaryTable.clear();
        rows.forEach(r => {
            summaryTable.row.add([
                r.tanggal,
                r.total_trx.toLocaleString(),
                ChartsManager.formatRupiah(r.nominal),
                ChartsManager.formatRupiah(r.cash),
                ChartsManager.formatRupiah(r.qris),
                ChartsManager.formatRupiah(r.debit),
                ChartsManager.formatRupiah(r.avg)
            ]);
        });
        summaryTable.draw();
    }
    
    function showToast(msg, type) {
        const toast = $('#toastMsg');
        $('#toastText').text(msg);
        toast.fadeIn(300);
        setTimeout(() => toast.fadeOut(500), 3000);
    }
});
