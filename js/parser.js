// SQL Parser Module
const SQLParser = (function() {
    // Parse SQL COPY format
    function parseSQLCopy(sqlText) {
        const result = {
            c_trans: [],
            c_tsale: [],
            m_cust: [],
            m_loader: [],
            cek_eod: []
        };
        
        const lines = sqlText.split(/\r?\n/);
        let currentTable = null;
        let columns = [];
        let inCopy = false;
        let copyDataLines = [];

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let copyMatch = line.match(/^COPY public\.(\w+)\s*\((.*?)\)\s+FROM stdin;/i);
            
            if (copyMatch) {
                currentTable = copyMatch[1].toLowerCase();
                let colStr = copyMatch[2];
                columns = colStr.split(',').map(c => c.trim().replace(/"/g, ''));
                inCopy = true;
                copyDataLines = [];
                continue;
            }
            
            if (inCopy) {
                if (line.trim() === '\\ .' || line.trim() === '\\.') {
                    const parsedRows = parseCopyDataRows(copyDataLines, columns, currentTable);
                    if (result[currentTable]) {
                        result[currentTable].push(...parsedRows);
                    }
                    inCopy = false;
                    currentTable = null;
                    continue;
                }
                if (line.startsWith('--') || line.trim() === '') continue;
                copyDataLines.push(line);
            }
        }
        
        return result;
    }

    function parseCopyDataRows(rows, columns, tableName) {
        const dataRows = [];
        
        for (let row of rows) {
            if (row.trim() === '') continue;
            
            let values = [];
            let current = '';
            let inEscape = false;
            
            for (let ch of row) {
                if (ch === '\\' && !inEscape) {
                    inEscape = true;
                    current += ch;
                    continue;
                }
                if (ch === '\t' && !inEscape) {
                    values.push(cleanNullValue(current));
                    current = '';
                    continue;
                }
                current += ch;
                inEscape = false;
            }
            values.push(cleanNullValue(current));
            
            if (values.length !== columns.length) continue;
            
            let obj = {};
            columns.forEach((col, idx) => {
                obj[col] = values[idx];
            });
            
            // Parse numeric values
            if (tableName === 'c_trans') {
                obj.price = parseFloat(obj.price) || 0;
                obj.qty = parseFloat(obj.qty) || 0;
            }
            if (tableName === 'c_tsale') {
                obj.jum = parseFloat(obj.jum) || 0;
                obj.cash = parseFloat(obj.cash) || 0;
                obj.card = parseFloat(obj.card) || 0;
                obj.kembali = parseFloat(obj.kembali) || 0;
            }
            if (tableName === 'm_cust') {
                obj.point = parseInt(obj.point) || 0;
            }
            if (tableName === 'm_loader') {
                obj.price1 = parseFloat(obj.price1) || 0;
                obj.m_price = parseFloat(obj.m_price) || 0;
            }
            
            dataRows.push(obj);
        }
        
        return dataRows;
    }

    function cleanNullValue(val) {
        if (!val || val === '\\N' || val === 'NULL') return null;
        if (val.startsWith('\\') && val.length > 1) return val.substring(1);
        return val;
    }

    // Calculate Profit & Loss
    function calculateProfitLoss(data) {
        const productSales = new Map();
        
        // Aggregate sales by product
        data.c_trans.forEach(trans => {
            const plu = trans.plu;
            if (!plu) return;
            
            const product = data.m_loader.find(p => p.plu === plu);
            if (!product) return;
            
            const qty = trans.qty || 0;
            const revenue = (trans.price || 0) * qty;
            const hpp = (product.m_price || 0) * qty;
            const profit = revenue - hpp;
            const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
            
            if (!productSales.has(plu)) {
                productSales.set(plu, {
                    plu: plu,
                    name: trans.descp || product.descp || '-',
                    category: trans.kategori || product.kategori || '-',
                    qty: 0,
                    revenue: 0,
                    hpp: 0,
                    profit: 0
                });
            }
            
            const record = productSales.get(plu);
            record.qty += qty;
            record.revenue += revenue;
            record.hpp += hpp;
            record.profit += profit;
        });
        
        // Calculate totals
        let totalRevenue = 0;
        let totalHPP = 0;
        let totalProfit = 0;
        
        const profitLossData = Array.from(productSales.values()).map(item => {
            totalRevenue += item.revenue;
            totalHPP += item.hpp;
            totalProfit += item.profit;
            
            return {
                ...item,
                margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : 0
            };
        });
        
        return {
            products: profitLossData.sort((a, b) => b.profit - a.profit),
            totalRevenue: totalRevenue,
            totalHPP: totalHPP,
            totalProfit: totalProfit
        };
    }

    return {
        parseSQLCopy: parseSQLCopy,
        calculateProfitLoss: calculateProfitLoss
    };
})();
