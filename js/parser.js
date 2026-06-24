// SQL Parser Module - FIXED ANTI NOMBOK VERSION (OPTIMIZED)
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
                obj[col] = typeof values[idx] === 'string' ? values[idx].trim() : values[idx];
            });
            
            if (tableName === 'c_trans') {
                obj.price = parseFloat(obj.price) || 0;
                obj.qty = parseFloat(obj.qty) || 0;
            }
            
            if (tableName === 'c_tsale') {
                obj.jum = parseFloat(obj.jum) || 0;
                obj.cash = parseFloat(obj.cash) || 0;
                obj.card = parseFloat(obj.card) || 0;
                obj.kembali = parseFloat(obj.kembali) || 0;
                obj.disc = parseFloat(obj.disc) || 0;
                obj.voucher = parseFloat(obj.voucher) || 0;
                obj.donasi = parseFloat(obj.donasi) || 0;
                obj.hemat = parseFloat(obj.hemat) || 0;

                obj.fix_setoran_server = obj.jum - obj.disc - obj.card - obj.voucher - obj.donasi - obj.hemat;
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

    function calculateProfitLoss(data) {
        const productSales = new Map();
        const loaderMap = new Map();
        
        if (data.m_loader && Array.isArray(data.m_loader)) {
            data.m_loader.forEach(p => {
                const pluKey = p.plu || p.PLU; 
                if (pluKey) {
                    loaderMap.set(String(pluKey).trim(), p);
                }
            });
        }
        
        data.c_trans.forEach(trans => {
            const transPlu = trans.plu || trans.PLU;
            if (!transPlu) return;
            
            const cleanTransPlu = String(transPlu).trim();
            const product = loaderMap.get(cleanTransPlu);
            
            const qty = trans.qty || 0;
            const price = trans.price || 0;
            const revenue = price * qty;
            
            // 🚀 STRATEGI ANTI ANGKA NOL:
            // Kita cek m_price di m_loader ATAU avg_cost di c_trans. 
            // Jika dua-duanya bernilai 0, kita paksa pakai estimasi modal 75% dari harga jual!
            let unitHpp = 0;
            
            const masterHpp = product ? (product.m_price || product.M_PRICE || 0) : 0;
            const transHpp = trans.avg_cost || trans.AVG_COST || 0;
            
            if (masterHpp > 0) {
                unitHpp = masterHpp;
            } else if (transHpp > 0) {
                unitHpp = transHpp;
            } else {
                // Jika server ngasih angka 0, kita buat asumsi modal toko sebesar 75% dari harga jual
                unitHpp = price * 0.75; 
            }
            
            const hpp = unitHpp * qty;
            const profit = revenue - hpp;
            
            if (!productSales.has(cleanTransPlu)) {
                productSales.set(cleanTransPlu, {
                    plu: cleanTransPlu,
                    name: trans.descp || (product ? (product.descp || product.DESCP) : '-') || '-',
                    category: trans.kategori || (product ? (product.kategori || product.KATEGORI) : '-') || '-',
                    qty: 0,
                    revenue: 0,
                    hpp: 0,
                    profit: 0
                });
            }
            
            const record = productSales.get(cleanTransPlu);
            record.qty += qty;
            record.revenue += revenue;
            record.hpp += hpp;
            record.profit += profit;
        });
        
        let totalRevenue = 0;
        let totalHPP = 0;
        let totalProfit = 0;
        
        const profitLossData = Array.from(productSales.values()).map(item => {
            totalRevenue += item.revenue;
            totalHPP += item.hpp;
            totalProfit += item.profit;
            
            return {
                ...item,
                margin: item.revenue > 0 ? ((item.profit / item.revenue) * 100).toFixed(2) : "0.00"
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
