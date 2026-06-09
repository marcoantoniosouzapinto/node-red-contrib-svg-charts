module.exports = function(RED) {
    function SVGChartNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on('input', function(msg) {
            // 1. Resgatando propriedades dinâmicas do MSG (Sobrescreve a configuração)
            const w = msg.width || parseInt(config.width) || 600;
            const h = msg.height || parseInt(config.height) || 400;
            const chartTitle = msg.title || config.title || "";
            const margin = { top: chartTitle ? 80 : 40, right: 80, bottom: 80, left: 80 };
            const chartW = w - margin.left - margin.right;
            const chartH = h - margin.top - margin.bottom;

            // 2. Parser Inteligente para Suportar Múltiplas Linhas (Series)
            let seriesData = [];
            if (Array.isArray(msg.payload)) {
                if (msg.payload.length > 0 && Array.isArray(msg.payload[0].data)) {
                    // Formato Multi-Series detectado
                    seriesData = msg.payload;
                } else {
                    // Formato Simples (Uma única série)
                    seriesData = [{ series: "Série 1", data: msg.payload, color: config.color }];
                }
            } else {
                seriesData = [{ series: "Série 1", data: [msg.payload], color: config.color }];
            }

            // Normalizando os dados internamente
            let allValues = [];
            seriesData.forEach(s => {
                s.color = s.color || config.color;
                s.data = s.data.map(d => {
                    let obj = (typeof d === 'object' && d !== null) ? d : { value: Number(d), label: "" };
                    obj.value = isNaN(obj.value) ? 0 : obj.value;
                    allValues.push(obj.value);
                    return obj;
                });
            });

            // 3. Cálculo de Escala e Grade Ajustado
            let yMin = config.ymin !== "" ? parseFloat(config.ymin) : Math.min(...allValues, 0);
            let yMax = config.ymax !== "" ? parseFloat(config.ymax) : Math.max(...allValues, 1);
            if (yMin === yMax) yMax += 10;
            const range = yMax - yMin;
            const yStep = parseFloat(config.ystep) || range / 5;

            // 4. Definições de Estilo e Fundo
            const isDark = (config.bgColor.includes('dark') || config.bgColor === "#2d2d2d" || config.bgColor.includes('purple'));
            const textColor = isDark ? "#E0E0E0" : "#333333";
            const gridColor = isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)";

            let svg = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
            
            // Gradientes correspondendo perfeitamente aos option values
            svg += `<defs>
                <linearGradient id="gradient-purple" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#2D0E4B"/><stop offset="100%" stop-color="#8A2BE2"/></linearGradient>
                <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#004e92"/><stop offset="100%" stop-color="#000428"/></linearGradient>
                <linearGradient id="gradient-sunset" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ee0979"/><stop offset="100%" stop-color="#ff6a00"/></linearGradient>
                <linearGradient id="gradient-dark" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#434343"/><stop offset="100%" stop-color="#000000"/></linearGradient>
            </defs>`;

            let bgStyle = config.bgColor;
            if (config.bgColor.startsWith('gradient-')) bgStyle = `url(#${config.bgColor})`;
            svg += `<rect width="100%" height="100%" fill="${bgStyle}" rx="15"/>`;

            // Título Dinâmico
            if (chartTitle) svg += `<text x="${w/2}" y="${margin.top/2 + 10}" text-anchor="middle" font-family="Arial" font-size="22" font-weight="bold" fill="${textColor}">${chartTitle}</text>`;

            // 5. Renderizando as Grades com segurança
            if (["bar", "line", "area"].includes(config.chartType) && config.showGrid !== "false") {
                for (let v = yMin; v <= yMax + (yStep/2); v += yStep) {
                    const yPos = h - margin.bottom - ((v - yMin) / range * chartH);
                    // Evita desenhar grade fora do quadro
                    if (yPos >= margin.top - 5 && yPos <= h - margin.bottom + 5) {
                        svg += `<line x1="${margin.left}" y1="${yPos}" x2="${w-margin.right}" y2="${yPos}" stroke="${gridColor}" stroke-width="1"/>`;
                        svg += `<text x="${margin.left-10}" y="${yPos+4}" text-anchor="end" font-family="Arial" font-size="11" fill="${textColor}">${v.toFixed(1).replace('.0', '')}</text>`;
                    }
                }
            }

            // Funções de posição
            const getY = (val) => h - margin.bottom - ((val - yMin) / range * chartH);

            // 6. Desenhando os Gráficos
            if (config.chartType === "line" || config.chartType === "area") {
                // Suporte total a Múltiplas Linhas
                seriesData.forEach((series) => {
                    const data = series.data;
                    const getX = (i) => margin.left + (i * (chartW / (data.length - 1 || 1)));
                    
                    let pts = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
                    let pathData = "";
                    
                    if (config.smooth && pts.length > 2) {
                        pathData = `M ${pts[0].x},${pts[0].y}`;
                        for (let i = 0; i < pts.length - 1; i++) {
                            const midX = (pts[i].x + pts[i+1].x) / 2;
                            pathData += ` Q ${pts[i].x},${pts[i].y} ${midX},${(pts[i].y + pts[i+1].y)/2}`;
                        }
                        pathData += ` T ${pts[pts.length-1].x},${pts[pts.length-1].y}`;
                    } else {
                        pathData = pts.map((p, i) => (i === 0 ? "M" : "L") + `${p.x},${p.y}`).join(" ");
                    }

                    if (config.chartType === "area") svg += `<path d="${pathData} L ${pts[pts.length-1].x},${h-margin.bottom} L ${margin.left},${h-margin.bottom} Z" fill="${series.color}" fill-opacity="0.3"/>`;
                    
                    svg += `<path d="${pathData}" fill="none" stroke="${series.color}" stroke-width="4" stroke-linecap="round"/>`;
                    
                    pts.forEach((p, i) => {
                        svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${series.color}" stroke="${isDark?'#000':'#fff'}" stroke-width="2"/>`;
                        if(data[i].label) svg += `<text x="${p.x}" y="${h-margin.bottom+25}" text-anchor="middle" font-family="Arial" font-size="11" fill="${textColor}">${data[i].label}</text>`;
                    });
                });
            }
            else if (config.chartType === "bar") {
                const data = seriesData[0].data; // Pega a primeira série para barras
                const bW = (chartW / data.length);
                data.forEach((d, i) => {
                    const x = margin.left + (i * bW);
                    const barH = ((d.value - yMin) / range) * chartH;
                    svg += `<rect x="${x+bW*0.15}" y="${h-margin.bottom-barH}" width="${bW*0.7}" height="${barH}" fill="${d.color}" rx="4"/>`;
                    svg += `<text x="${x+bW/2}" y="${h-margin.bottom-barH-8}" text-anchor="middle" font-family="Arial" font-size="11" fill="${textColor}">${d.value}</text>`;
                    if(d.label) svg += `<text x="${x+bW/2}" y="${h-margin.bottom+25}" text-anchor="middle" font-family="Arial" font-size="12" fill="${textColor}">${d.label}</text>`;
                });
            }
            else if (config.chartType === "bar-h") {
                const data = seriesData[0].data;
                const bH = (chartH / data.length);
                data.forEach((d, i) => {
                    const y = margin.top + (i * bH);
                    const barW = ((d.value - yMin) / range) * chartW;
                    svg += `<rect x="${margin.left}" y="${y+bH*0.15}" width="${barW}" height="${bH*0.7}" fill="${d.color}" rx="4"/>`;
                    svg += `<text x="${margin.left+barW+5}" y="${y+bH/2+5}" font-family="Arial" font-size="11" fill="${textColor}">${d.value}</text>`;
                    if(d.label) svg += `<text x="${margin.left-10}" y="${y+bH/2+5}" text-anchor="end" font-family="Arial" font-size="12" fill="${textColor}">${d.label}</text>`;
                });
            }
            else if (config.chartType === "pie" || config.chartType === "donut") {
                const data = seriesData[0].data;
                const total = data.reduce((a, b) => a + b.value, 0);
                let startAngle = 0;
                const cx = w/2, cy = h/2 + 10, r = Math.min(chartW, chartH)/2.2;

                data.forEach(d => {
                    const angle = (d.value / total) * 360;
                    const x1 = cx + r * Math.cos(Math.PI * (startAngle - 90) / 180);
                    const y1 = cy + r * Math.sin(Math.PI * (startAngle - 90) / 180);
                    const x2 = cx + r * Math.cos(Math.PI * (startAngle + angle - 90) / 180);
                    const y2 = cy + r * Math.sin(Math.PI * (startAngle + angle - 90) / 180);
                    
                    svg += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${angle > 180 ? 1 : 0} 1 ${x2} ${y2} Z" fill="${d.color}" stroke="${isDark?'#222':'#fff'}" stroke-width="1.5"/>`;
                    
                    const midAngle = startAngle + angle/2;
                    const lx = cx + (r * 1.2) * Math.cos(Math.PI * (midAngle - 90) / 180);
                    const ly = cy + (r * 1.2) * Math.sin(Math.PI * (midAngle - 90) / 180);
                    svg += `<text x="${lx}" y="${ly}" text-anchor="${lx > cx ? 'start' : 'end'}" font-family="Arial" font-size="12" font-weight="bold" fill="${textColor}">${d.label || ''} (${d.value})</text>`;
                    
                    startAngle += angle;
                });
                if (config.chartType === "donut") svg += `<circle cx="${cx}" cy="${cy}" r="${r*0.6}" fill="${bgStyle.includes('url') ? (isDark ? '#1a1a1a' : '#fff') : bgStyle}"/>`;
            }

            svg += `</svg>`;

            msg.payload = svg;
            msg.base64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
            node.send(msg);
        });
    }
    RED.nodes.registerType("svg-chart", SVGChartNode);
};