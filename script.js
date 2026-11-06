let state = {
    cash: 1000.00,
    dropshipping: { assets: [] },
    local: { style: 'food', stock: 10, footTraffic: 12 },
    farm: { wheatSeeds: 5, tomatoSeeds: 3, rawWheat: 0, rawTomato: 0, preparedBread: 0, preparedPasta: 0 },
    upgrades: { copywriting: 0, pixel: 0, lights: 0, hydroponics: 0 },
    stocks: {
        '67coin': { held: 0, priceHistory: [], currentPrice: 10, baseVolatility: 0.15 },
        'Bitcoin': { held: 0, priceHistory: [], currentPrice: 100, baseVolatility: 0.08 },
        'Moscoin': { held: 0, priceHistory: [], currentPrice: 5, baseVolatility: 0.25 },
        'Gold': { held: 0, priceHistory: [], currentPrice: 50, baseVolatility: 0.03 },
        'One Piece': { held: 0, priceHistory: [], currentPrice: 1000, baseVolatility: 0.80 }
    }
};

let farmPlots = Array(6).fill(null).map(() => ({ condition: 'empty', type: '', progress: 0 }));

if (localStorage.getItem('venturecraft_save')) {
    try {
        const loadedState = JSON.parse(localStorage.getItem('venturecraft_save'));
        if (loadedState && typeof loadedState.cash === 'number') {
            state = { ...state, ...loadedState };
        }
    } catch(e) { console.error("Save load initialization error failed."); }
}

document.addEventListener('DOMContentLoaded', () => {
    refreshUI();
    initStockMarketHTML();
    initStockMarketLoop();
    initCanvasEngine();
});

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(id);
    if(target) target.classList.add('active');
    saveProfile();
    refreshUI();
    if (id === 'stock-screen') updateStockMarketVisuals();
}

function toggleTheme() { document.body.classList.toggle('light-theme'); }
function saveProfile() { localStorage.setItem('venturecraft_save', JSON.stringify(state)); }
function resetGame() { if(confirm("PERMANENTLY PURGE CORE PROFILE DATA UNITS?")) { localStorage.clear(); location.reload(); } }
function startMode(mode) { switchScreen(`${mode}-screen`); if(mode === 'farm') renderFields(); }

function refreshUI() {
    document.querySelectorAll('.global-cash-display').forEach(el => el.innerText = state.cash.toFixed(2));
    if (document.getElementById('drop-count')) document.getElementById('drop-count').innerText = state.dropshipping.assets.length;
    if (document.getElementById('local-type-display')) document.getElementById('local-type-display').innerText = state.local.style === 'food' ? '🌮 Neon Street Stall' : '⚡ Cyberware Implants';
    if (document.getElementById('local-inv')) document.getElementById('local-inv').innerText = state.local.stock;
    if (document.getElementById('local-traffic-display')) document.getElementById('local-traffic-display').innerText = state.local.footTraffic + (state.upgrades.lights * 3);
    if (document.getElementById('farm-seeds-w')) document.getElementById('farm-seeds-w').innerText = state.farm.wheatSeeds;
    if (document.getElementById('farm-seeds-t')) document.getElementById('farm-seeds-t').innerText = state.farm.tomatoSeeds;
    if (document.getElementById('inv-wheat')) document.getElementById('inv-wheat').innerText = state.farm.rawWheat;
    if (document.getElementById('inv-tomato')) document.getElementById('inv-tomato').innerText = state.farm.rawTomato;
    
    // Kitchen dynamic assets
    if (document.getElementById('inv-bread')) document.getElementById('inv-bread').innerText = state.farm.preparedBread;
    if (document.getElementById('inv-pasta')) document.getElementById('inv-pasta').innerText = state.farm.preparedPasta;

    if(document.getElementById('up-copy-lvl')) {
        document.getElementById('up-copy-lvl').innerText = state.upgrades.copywriting;
        document.getElementById('up-copy-cost').innerText = state.upgrades.copywriting >= 10 ? 'MAX_REACHED' : (state.upgrades.copywriting + 1) * 200;
        document.getElementById('up-pixel-lvl').innerText = state.upgrades.pixel;
        document.getElementById('up-pixel-cost').innerText = state.upgrades.pixel >= 10 ? 'MAX_REACHED' : (state.upgrades.pixel + 1) * 350;
        document.getElementById('up-lights-lvl').innerText = state.upgrades.lights;
        document.getElementById('up-lights-cost').innerText = state.upgrades.lights >= 10 ? 'MAX_REACHED' : (state.upgrades.lights + 1) * 250;
        document.getElementById('up-hydro-lvl').innerText = state.upgrades.hydroponics;
        document.getElementById('up-hydro-cost').innerText = state.upgrades.hydroponics >= 10 ? 'MAX_REACHED' : (state.upgrades.hydroponics + 1) * 300;
    }
}

function buyUpgrade(type) {
    if (type === 'hydroponic') type = 'hydroponics';
    let currentLvl = state.upgrades[type];
    if (currentLvl >= 10) return alert("System level threshold limit at 10 reached!");
    let cost = type === 'copywriting' ? (currentLvl + 1) * 200 : type === 'pixel' ? (currentLvl + 1) * 350 : type === 'lights' ? (currentLvl + 1) * 250 : (currentLvl + 1) * 300;
    if (state.cash >= cost) {
        state.cash = parseFloat((state.cash - cost).toFixed(2));
        state.upgrades[type]++;
        saveProfile(); refreshUI();
    } else { alert("Insufficient matrix balance reserves!"); }
}

function buySeeds(type) {
    if (type === 'wheat' && state.cash >= 10) { state.cash = parseFloat((state.cash - 10).toFixed(2)); state.farm.wheatSeeds += 5; }
    else if (type === 'tomato' && state.cash >= 25) { state.cash = parseFloat((state.cash - 25).toFixed(2)); state.farm.tomatoSeeds += 3; }
    else { return alert("Insufficient matrix balance reserves for bio-embryos!"); }
    saveProfile(); refreshUI();
}

let board, drawEngine;
let painting = false, lastDrawX = 0, lastDrawY = 0, currentPenColor = '#00ffcc';

function initCanvasEngine() {
    board = document.getElementById('productCanvas');
    if (!board) return;
    drawEngine = board.getContext('2d');
    board.width = board.offsetWidth || 340; board.height = board.offsetHeight || 150;
    
    board.addEventListener('mousedown', (e) => { 
        painting = true; const d = board.getBoundingClientRect();
        lastDrawX = (e.clientX - d.left) * (board.width / d.width);
        lastDrawY = (e.clientY - d.top) * (board.height / d.height);
    });
    board.addEventListener('mouseup', () => painting = false);
    board.addEventListener('mousemove', (e) => {
        if (!painting || !drawEngine) return;
        drawEngine.lineWidth = 4; drawEngine.lineCap = 'round'; drawEngine.lineJoin = 'round'; drawEngine.strokeStyle = currentPenColor;
        const d = board.getBoundingClientRect();
        const cx = (e.clientX - d.left) * (board.width / d.width);
        const cy = (e.clientY - d.top) * (board.height / d.height);
        drawEngine.beginPath(); drawEngine.moveTo(lastDrawX, lastDrawY); drawEngine.lineTo(cx, cy); drawEngine.stroke();
        lastDrawX = cx; lastDrawY = cy;
    });
}

function setCanvasColor(hex) { currentPenColor = hex; }
function clearCanvas() { if(drawEngine) drawEngine.clearRect(0, 0, board.width, board.height); }

function saveProduct() {
    const tBox = document.getElementById('drop-name'), cBox = document.getElementById('drop-price'), dBox = document.getElementById('drop-desc');
    if(!tBox.value || !cBox.value || !dBox.value) return alert("All structural metric fields required!");
    const price = parseFloat(cBox.value), pitch = dBox.value.toLowerCase();
    let score = 25;
    if (pitch.length > 25) score += 20; if (pitch.length > 70) score += 20;
    if (pitch.includes("premium") || pitch.includes("luxury")) score += 15;
    score += (state.upgrades.copywriting * 15);
    let conv = score - (price / (3.0 + (state.upgrades.pixel)));
    if (conv < 6) conv = 6;
    state.dropshipping.assets.push({ title: tBox.value, cost: price, conversionChance: Math.min(conv, 95) });
    document.getElementById('drop-feed').innerHTML = `<div class="system-line">[SYS] Pipeline "${tBox.value}" initialized (${Math.round(conv)}% match)</div>` + document.getElementById('drop-feed').innerHTML;
    tBox.value = ''; cBox.value = ''; dBox.value = ''; clearCanvas(); saveProfile(); refreshUI();
}

setInterval(() => {
    if(state.dropshipping.assets.length > 0 && document.getElementById('drop-screen').classList.contains('active')) {
        const item = state.dropshipping.assets[Math.floor(Math.random() * state.dropshipping.assets.length)];
        if(Math.random() * 100 < item.conversionChance) {
            const net = parseFloat((item.cost * 0.6).toFixed(2)); state.cash = parseFloat((state.cash + net).toFixed(2));
            document.getElementById('drop-feed').innerHTML = `<div style="color:#00ff66;">🗲 Packet transaction verified: 1x "${item.title}" (+$${net})</div>` + document.getElementById('drop-feed').innerHTML;
        }
        refreshUI();
    }
}, 3800);

function changeNiche() { state.local.style = document.getElementById('local-niche-select').value; saveProfile(); refreshUI(); }
function buyInventory() { if(state.cash >= 100) { state.cash = parseFloat((state.cash - 100).toFixed(2)); state.local.stock += 10; saveProfile(); refreshUI(); } }

setInterval(() => {
    if (document.getElementById('local-screen').classList.contains('active') && state.local.stock > 0) {
        if (Math.random() * 100 < ((state.local.footTraffic + (state.upgrades.lights * 3)) * 3.5)) {
            state.local.stock--; const earn = state.local.style === 'food' ? 25.00 : 75.00;
            state.cash = parseFloat((state.cash + earn).toFixed(2));
            document.getElementById('local-feed').innerHTML = `<div style="color:#00ff66;">🗲 Node sale recorded: Front supply processed (+$${earn})</div>` + document.getElementById('local-feed').innerHTML;
            refreshUI();
        }
    }
}, 3000);

function renderFields() {
    const grid = document.getElementById('farmPlotsContainer'); if (!grid) return; grid.innerHTML = '';
    farmPlots.forEach((plot, idx) => {
        const card = document.createElement('div'); card.className = `plot-card ${plot.condition}`;
        if (plot.condition === 'empty') {
            card.innerHTML = `<h4>MATRIX GRID 0${idx + 1}</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                    <button class="btn btn-sm" onclick="plantCrop(${idx}, 'wheat')">WHEAT</button>
                    <button class="btn btn-sm" style="border-color:#ff9800; color:#ff9800;" onclick="plantCrop(${idx}, 'tomato')">TOMATO</button>
                </div>`;
        } else if (plot.condition === 'growing') {
            card.innerHTML = `<h4>MATRIX GRID 0${idx+1}</h4><p style="color:#0088ff; font-size:0.85rem; font-weight:bold;">INCUBATING (${plot.progress}%)</p>`;
        } else if (plot.condition === 'ready') {
            card.innerHTML = `<h4>MATRIX GRID 0${idx+1}</h4><button class="btn btn-sm btn-green" style="width:100%;" onclick="harvestCrop(${idx})">EXTRACT CELLS</button>`;
        }
        grid.appendChild(card);
    });
}

window.plantCrop = function(idx, type) {
    if (type === 'wheat' && state.farm.wheatSeeds > 0) { state.farm.wheatSeeds--; farmPlots[idx] = { condition: 'growing', type: 'wheat', progress: 0 }; }
    else if (type === 'tomato' && state.farm.tomatoSeeds > 0) { state.farm.tomatoSeeds--; farmPlots[idx] = { condition: 'growing', type: 'tomato', progress: 0 }; }
    else { return alert("Bio-seed reserves missing!"); }
    renderFields(); refreshUI();
    let speed = 1 + (state.upgrades.hydroponics * 0.25);
    let interval = setInterval(() => {
        if (farmPlots[idx] && farmPlots[idx].condition === 'growing') {
            farmPlots[idx].progress += Math.round(10 * speed);
            if (farmPlots[idx].progress >= 100) { farmPlots[idx].progress = 100; farmPlots[idx].condition = 'ready'; clearInterval(interval); }
            if (document.getElementById('farm-screen').classList.contains('active')) renderFields();
        } else { clearInterval(interval); }
    }, 800);
};

window.harvestCrop = function(idx) {
    if (farmPlots[idx].type === 'wheat') state.farm.rawWheat += 2; else state.farm.rawTomato += 2;
    farmPlots[idx] = { condition: 'empty', type: '', progress: 0 };
    saveProfile(); renderFields(); refreshUI();
};

window.processFood = function(type) {
    if (type === 'bread') {
        if (state.farm.rawWheat >= 3) {
            state.farm.rawWheat -= 3;
            state.farm.preparedBread += 1;
            logFarmMessage("🍞 Synthesized 1x Neon Nutri-Bread!", "#0088ff");
        } else { alert("Insufficient materials! Requires 3 Raw Wheat Cells."); }
    } else if (type === 'pasta') {
        if (state.farm.rawWheat >= 2 && state.farm.rawTomato >= 2) {
            state.farm.rawWheat -= 2;
            state.farm.rawTomato -= 2;
            state.farm.preparedPasta += 1;
            logFarmMessage("🍝 Synthesized 1x Chromium Tomato Pasta!", "#0088ff");
        } else { alert("Insufficient materials! Requires 2 Wheat + 2 Tomato elements."); }
    }
    saveProfile(); refreshUI();
};

window.sellFood = function(type) {
    if (type === 'bread') {
        if (state.farm.preparedBread > 0) {
            state.farm.preparedBread -= 1;
            state.cash = parseFloat((state.cash + 45.00).toFixed(2));
            logFarmMessage("💰 Liquidated 1x Nutri-Bread for +$45.00", "#00ff66");
        } else { alert("Vault reserves empty for this asset format!"); }
    } else if (type === 'pasta') {
        if (state.farm.preparedPasta > 0) {
            state.farm.preparedPasta -= 1;
            state.cash = parseFloat((state.cash + 90.00).toFixed(2));
            logFarmMessage("💰 Liquidated 1x Tomato Pasta for +$90.00", "#00ff66");
        } else { alert("Vault reserves empty for this asset format!"); }
    }
    saveProfile(); refreshUI();
};

function logFarmMessage(msg, color = "#fff") {
    const feed = document.getElementById('farm-feed');
    if (feed) { feed.innerHTML = `<div style="color:${color};">[BIO] ${msg}</div>` + feed.innerHTML; }
}

function initStockMarketHTML() {
    const container = document.getElementById('stock-grid-container'); if (!container) return; container.innerHTML = '';
    for (let name in state.stocks) {
        let id = name.replace(' ', '-');
        let card = document.createElement('div'); card.className = 'upgrade-item'; card.id = `stock-card-${id}`; card.style.marginBottom = '15px';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div><h3 style="margin:0; font-family:'Orbitron', sans-serif;" id="stock-name-${id}">${name}</h3><small id="stock-held-${id}">Vault: 0</small></div>
                <div style="text-align:right;"><div style="font-size:1.3rem; font-weight:bold; font-family:'Orbitron', sans-serif;" id="stock-price-${id}">$0</div><small id="stock-trend-${id}">📈 VOLATILE</small></div>
            </div>
            <div style="height:40px; background:rgba(0,0,0,0.4); border-radius:0; margin-bottom:10px; border: 1px solid rgba(255,255,255,0.05);">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style="width:100%; height:100%;"><polyline fill="none" id="stock-polyline-${id}" stroke="#00ff66" stroke-width="2" points="0,20 100,20"/></svg>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div><input type="number" id="amt-buy-${id}" placeholder="Credits ($)" style="margin-bottom:5px; padding:5px; background:black; border:1px solid #333; color:white; width:100%;"><button class="btn btn-sm" style="width:100%;" onclick="tradeAsset('${name}', 'buy')">ACQUIRE</button></div>
                <div><input type="number" id="amt-sell-${id}" placeholder="Units" style="margin-bottom:5px; padding:5px; background:black; border:1px solid #333; color:white; width:100%;"><button class="btn btn-sm" style="width:100%; border-color:#ff0055; color:#ff0055;" onclick="tradeAsset('${name}', 'sell')">LIQUIDATE</button></div>
            </div>`;
        container.appendChild(card);
    }
}

function initStockMarketLoop() {
    setInterval(() => {
        let alerts = [];
        for (let name in state.stocks) {
            let asset = state.stocks[name]; let change = (Math.random() - 0.48) * 2 * asset.baseVolatility;
            if (name === 'One Piece') { if (Math.random() < 0.01) change = 8.0; else change = (Math.random() - 0.65) * asset.baseVolatility; }
            asset.currentPrice = Math.max(0.50, asset.currentPrice * (1 + change)); asset.priceHistory.push(asset.currentPrice);
            if (asset.priceHistory.length > 15) asset.priceHistory.shift();
            if (change > 0.15 && asset.held > 0) alerts.push(`🔥 HIGH MARGIN VELOCITY: "${name}" surge detected!`);
        }
        const displayAlert = document.getElementById('market-notification');
        if (displayAlert) {
            if(alerts.length > 0 && document.getElementById('stock-screen').classList.contains('active')) {
                displayAlert.innerText = alerts.join(" | "); displayAlert.style.display = 'block';
            } else { displayAlert.style.display = 'none'; }
        }
        if (document.getElementById('stock-screen').classList.contains('active')) updateStockMarketVisuals();
    }, 6000);
}

function updateStockMarketVisuals() {
    for (let name in state.stocks) {
        let asset = state.stocks[name], id = name.replace(' ', '-'), hist = asset.priceHistory;
        let trend = hist.length > 1 ? hist[hist.length - 1] >= hist[hist.length - 2] : true, color = trend ? '#00ff66' : '#ff0055';
        if (document.getElementById(`stock-card-${id}`)) document.getElementById(`stock-card-${id}`).style.borderColor = color;
        if (document.getElementById(`stock-name-${id}`)) document.getElementById(`stock-name-${id}`).style.color = color;
        if (document.getElementById(`stock-held-${id}`)) document.getElementById(`stock-held-${id}`).innerText = `Vault: ${asset.held.toFixed(2)}`;
        if (document.getElementById(`stock-price-${id}`)) { document.getElementById(`stock-price-${id}`).innerText = `$${asset.currentPrice.toFixed(2)}`; document.getElementById(`stock-price-${id}`).style.color = color; }
        if (document.getElementById(`stock-trend-${id}`)) { document.getElementById(`stock-trend-${id}`).innerText = trend ? '📈 HIGH DEMAND' : '📉 SHORT CURVE'; document.getElementById(`stock-trend-${id}`).style.color = color; }
        if (document.getElementById(`stock-polyline-${id}`)) {
            let min = Math.min(...hist), max = Math.max(...hist), r = max - min === 0 ? 1 : max - min;
            let pts = hist.map((v, i) => `${(i / (hist.length - 1)) * 100},${40 - (((v - min) / r) * 32 + 4)}`).join(' ');
            document.getElementById(`stock-polyline-${id}`).setAttribute('points', pts); document.getElementById(`stock-polyline-${id}`).setAttribute('stroke', color);
        }
    }
}

window.tradeAsset = function(name, action) {
    let asset = state.stocks[name], id = name.replace(' ', '-');
    if (action === 'buy') {
        let val = parseFloat(document.getElementById(`amt-buy-${id}`).value);
        if (isNaN(val) || val <= 0 || state.cash < val) return alert("Invalid entry or structural funds missing!");
        state.cash = parseFloat((state.cash - val).toFixed(2)); asset.held += (val / asset.currentPrice);
    } else {
        let units = parseFloat(document.getElementById(`amt-sell-${id}`).value);
        if (isNaN(units) || units <= 0 || asset.held < units) return alert("Invalid asset unit quantity request!");
        state.cash = parseFloat((state.cash + (units * asset.currentPrice)).toFixed(2)); asset.held -= units;
    }
    document.getElementById(`amt-buy-${id}`).value = ''; document.getElementById(`amt-sell-${id}`).value = '';
    saveProfile(); refreshUI(); updateStockMarketVisuals();
};
