// --- CENTRAL DATA SYSTEM ---
let state = {
    cash: 1000.00,
    dropshipping: { assets: [] },
    local: { style: 'food', stock: 10, footTraffic: 12 },
    farm: { wheatSeeds: 5, tomatoSeeds: 3, rawWheat: 0, rawTomato: 0, preparedBread: 0, preparedPasta: 0 },
    upgrades: { copywriting: 0, pixel: 0, lights: 0, hydroponics: 0 },
    stocks: {
        '67coin': { held: 0, priceHistory: [10, 10, 10], currentPrice: 10, baseVolatility: 0.15 },
        'Bitcoin': { held: 0, priceHistory: [100, 100, 100], currentPrice: 100, baseVolatility: 0.08 },
        'Moscoin': { held: 0, priceHistory: [5, 5, 5], currentPrice: 5, baseVolatility: 0.25 },
        'Gold': { held: 0, priceHistory: [50, 50, 50], currentPrice: 50, baseVolatility: 0.03 },
        'One Piece': { held: 0, priceHistory: [1000, 1000, 1000], currentPrice: 1000, baseVolatility: 0.80 }
    }
};

let farmPlots = Array(6).fill(null).map(() => ({ condition: 'empty', type: '', progress: 0 }));

if (localStorage.getItem('venturecraft_save')) {
    try {
        const loadedState = JSON.parse(localStorage.getItem('venturecraft_save'));
        if (loadedState && typeof loadedState.cash === 'number') {
            state = { ...state, ...loadedState };
            if (!state.stocks) {
                state.stocks = {
                    '67coin': { held: 0, priceHistory: [10, 10, 10], currentPrice: 10, baseVolatility: 0.15 },
                    'Bitcoin': { held: 0, priceHistory: [100, 100, 100], currentPrice: 100, baseVolatility: 0.08 },
                    'Moscoin': { held: 0, priceHistory: [5, 5, 5], currentPrice: 5, baseVolatility: 0.25 },
                    'Gold': { held: 0, priceHistory: [50, 50, 50], currentPrice: 50, baseVolatility: 0.03 },
                    'One Piece': { held: 0, priceHistory: [1000, 1000, 1000], currentPrice: 1000, baseVolatility: 0.80 }
                };
            }
        }
    } catch(e) { console.error("Profile structural parsing error."); }
}

document.addEventListener('DOMContentLoaded', () => {
    refreshUI();
    initStockMarketLoop();
});

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    saveProfile();
    refreshUI();
    if (id === 'stock-screen') renderStockMarket();
}

function toggleTheme() { document.body.classList.toggle('light-theme'); }
function saveProfile() { localStorage.setItem('venturecraft_save', JSON.stringify(state)); }

function resetGame() {
    if(confirm("Wipe all tracking metrics and start completely clean?")) {
        localStorage.clear();
        location.reload();
    }
}

function startMode(mode) {
    switchScreen(`${mode}-screen`);
    if(mode === 'farm') renderFields();
}

function refreshUI() {
    document.querySelectorAll('.global-cash-display').forEach(el => el.innerText = state.cash.toFixed(2));
    if (document.getElementById('drop-count')) document.getElementById('drop-count').innerText = state.dropshipping.assets.length;
    if (document.getElementById('local-type-display')) document.getElementById('local-type-display').innerText = state.local.style === 'food' ? '🌮 Gourmet Food Truck' : '⚡ Custom Electronics';
    if (document.getElementById('local-inv')) document.getElementById('local-inv').innerText = state.local.stock;
    if (document.getElementById('local-traffic-display')) document.getElementById('local-traffic-display').innerText = state.local.footTraffic + (state.upgrades.lights * 3);

    if (document.getElementById('farm-seeds-w')) document.getElementById('farm-seeds-w').innerText = state.farm.wheatSeeds;
    if (document.getElementById('farm-seeds-t')) document.getElementById('farm-seeds-t').innerText = state.farm.tomatoSeeds;
    if (document.getElementById('inv-wheat')) document.getElementById('inv-wheat').innerText = state.farm.rawWheat;
    if (document.getElementById('inv-tomato')) document.getElementById('inv-tomato').innerText = state.farm.rawTomato;
    if (document.getElementById('inv-bread')) document.getElementById('inv-bread').innerText = state.farm.preparedBread;
    if (document.getElementById('inv-pasta')) document.getElementById('inv-pasta').innerText = state.farm.preparedPasta;

    if (document.getElementById('up-copy-lvl')) document.getElementById('up-copy-lvl').innerText = state.upgrades.copywriting;
    if (document.getElementById('up-copy-cost')) document.getElementById('up-copy-cost').innerText = state.upgrades.copywriting >= 10 ? 'MAX' : (state.upgrades.copywriting + 1) * 200;
    if (document.getElementById('up-pixel-lvl')) document.getElementById('up-pixel-lvl').innerText = state.upgrades.pixel;
    if (document.getElementById('up-pixel-cost')) document.getElementById('up-pixel-cost').innerText = state.upgrades.pixel >= 10 ? 'MAX' : (state.upgrades.pixel + 1) * 350;
    if (document.getElementById('up-lights-lvl')) document.getElementById('up-lights-lvl').innerText = state.upgrades.lights;
    if (document.getElementById('up-lights-cost')) document.getElementById('up-lights-cost').innerText = state.upgrades.lights >= 10 ? 'MAX' : (state.upgrades.lights + 1) * 250;
    if (document.getElementById('up-hydro-lvl')) document.getElementById('up-hydro-lvl').innerText = state.upgrades.hydroponics;
    if (document.getElementById('up-hydro-cost')) document.getElementById('up-hydro-cost').innerText = state.upgrades.hydroponics >= 10 ? 'MAX' : (state.upgrades.hydroponics + 1) * 300;
}

function buyUpgrade(type) {
    let currentLvl = state.upgrades[type];
    if (currentLvl >= 10) return alert("This upgrade node has reached max level (10)!");
    
    let cost = 0;
    if (type === 'copywriting') cost = (currentLvl + 1) * 200;
    if (type === 'pixel') cost = (currentLvl + 1) * 350;
    if (type === 'lights') cost = (currentLvl + 1) * 250;
    if (type === 'hydroponics') cost = (currentLvl + 1) * 300;

    if (state.cash >= cost) {
        state.cash = parseFloat((state.cash - cost).toFixed(2));
        state.upgrades[type]++;
        saveProfile();
        refreshUI();
    } else { alert("Insufficient capital available!"); }
}

const board = document.getElementById('productCanvas');
let drawEngine = board ? board.getContext('2d') : null;
let painting = false;
let currentPenColor = '#000000';
let lastDrawX = 0, lastDrawY = 0;

if (board && drawEngine) {
    board.width = board.offsetWidth || 340;
    board.height = board.offsetHeight || 180;
    board.addEventListener('mousedown', (e) => { 
        painting = true; 
        const dimensions = board.getBoundingClientRect();
        lastDrawX = (e.clientX - dimensions.left) * (board.width / dimensions.width);
        lastDrawY = (e.clientY - dimensions.top) * (board.height / dimensions.height);
    });
    board.addEventListener('mouseup', () => painting = false);
    board.addEventListener('mouseleave', () => painting = false);
    board.addEventListener('mousemove', processStroke);
}

function setCanvasColor(hex) { currentPenColor = hex; }
function processStroke(e) {
    if (!painting || !drawEngine) return;
    drawEngine.lineWidth = 4; drawEngine.lineCap = 'round'; drawEngine.lineJoin = 'round'; drawEngine.strokeStyle = currentPenColor;
    const dimensions = board.getBoundingClientRect();
    const currentX = (e.clientX - dimensions.left) * (board.width / dimensions.width);
    const currentY = (e.clientY - dimensions.top) * (board.height / dimensions.height);
    drawEngine.beginPath(); drawEngine.moveTo(lastDrawX, lastDrawY); drawEngine.lineTo(currentX, currentY); drawEngine.stroke();
    lastDrawX = currentX; lastDrawY = currentY;
}
function clearCanvas() { if(drawEngine) drawEngine.clearRect(0, 0, board.width, board.height); }

function saveProduct() {
    const titleBox = document.getElementById('drop-name');
    const costBox = document.getElementById('drop-price');
    const descBox = document.getElementById('drop-desc');
    if(!titleBox.value || !costBox.value || !descBox.value) return alert("All fields are required!");

    const price = parseFloat(costBox.value);
    const textPitch = descBox.value.toLowerCase();
    let pitchScore = 25; 
    if (textPitch.length > 25) pitchScore += 20;
    if (textPitch.length > 70) pitchScore += 20;
    if (textPitch.includes("premium") || textPitch.includes("luxury")) pitchScore += 15;
    if (textPitch.includes("durable") || textPitch.includes("high quality")) pitchScore += 15;
    if (textPitch.includes("organic") || textPitch.includes("eco")) pitchScore += 15;
    pitchScore += (state.upgrades.copywriting * 15);

    let costSensitivyPenalty = (state.upgrades.pixel * 10);
    let conversionProbability = pitchScore - (price / (3.0 + (costSensitivyPenalty / 10)));
    if(conversionProbability < 6) conversionProbability = 6;
    if(price > 400) conversionProbability = 1; 

    state.dropshipping.assets.push({ title: titleBox.value, cost: price, conversionChance: Math.min(conversionProbability, 95) });
    const stream = document.getElementById('drop-feed');
    if (stream) stream.innerHTML = `<div style="color:#2196f3;">[SYS] "${titleBox.value}" launched. Conversion rating: ${Math.round(conversionProbability)}%</div>` + stream.innerHTML;
    titleBox.value = ''; costBox.value = ''; descBox.value = ''; clearCanvas(); saveProfile(); refreshUI();
}

setInterval(() => {
    if(state.dropshipping.assets.length > 0 && document.getElementById('dropshipping-screen').classList.contains('active')) {
        const item = state.dropshipping.assets[Math.floor(Math.random() * state.dropshipping.assets.length)];
        const stream = document.getElementById('drop-feed');
        if(Math.random() * 100 < item.conversionChance) {
            const netProfit = parseFloat((item.cost * 0.6).toFixed(2));
            state.cash = parseFloat((state.cash + netProfit).toFixed(2));
            if (stream) stream.innerHTML = `<div style="color:#4caf50;">✔ Conversion! Bought 1x "${item.title}". Net: +$${netProfit}</div>` + stream.innerHTML;
        } else if (stream) {
            stream.innerHTML = `<div style="color:#888;">&bull; Cart abandoned for "${item.title}".</div>` + stream.innerHTML;
        }
        if(stream && stream.children.length > 10) stream.removeChild(stream.lastChild);
        refreshUI();
    }
}, 3800);

function changeNiche() { state.local.style = document.getElementById('local-niche-select').value; saveProfile(); refreshUI(); }
function buyInventory() {
    if(state.cash >= 100) { state.cash = parseFloat((state.cash - 100).toFixed(2)); state.local.stock += 10; saveProfile(); refreshUI(); }
    else { alert("Not enough cash!"); }
}

setInterval(() => {
    if (document.getElementById('local-screen').classList.contains('active') && state.local.stock > 0) {
        const baseTraffic = state.local.footTraffic + (state.upgrades.lights * 3);
        if (Math.random() * 100 < (baseTraffic * 3.5)) {
            state.local.stock--;
            const itemValue = state.local.style === 'food' ? 25.00 : 75.00;
            state.cash = parseFloat((state.cash + itemValue).toFixed(2));
            const logBox = document.getElementById('local-feed');
            if (logBox) {
                logBox.innerHTML = `<div style="color:#4caf50;">✔ Customer sale! Earned: +$${itemValue.toFixed(2)}</div>` + logBox.innerHTML;
                if(logBox.children.length > 10) logBox.removeChild(logBox.lastChild);
            }
            refreshUI();
        }
    }
}, 3000);

function renderFields() {
    const grid = document.getElementById('farmPlotsContainer'); if (!grid) return; grid.innerHTML = '';
    farmPlots.forEach((plot, idx) => {
        const plotCard = document.createElement('div'); plotCard.className = `plot-card ${plot.condition}`;
        if (plot.condition === 'empty') {
            plotCard.innerHTML = `<h4>Plot ${idx + 1}</h4>
                <button class="btn" style="min-width:auto; padding:4px 8px; font-size:0.75rem;" onclick="plantCrop(${idx}, 'wheat')">Plant Wheat</button>
                <button class="btn" style="min-width:auto; padding:4px 8px; font-size:0.75rem; background:#ff9800;" onclick="plantCrop(${idx}, 'tomato')">Plant Tomato</button>`;
        } else if (plot.condition === 'growing') {
            plotCard.innerHTML = `<h4>Plot ${idx+1}</h4><p style="color:#2196f3; font-size:0.85rem;">Growing (${plot.progress}%)</p>`;
        } else if (plot.condition === 'ready') {
            plotCard.innerHTML = `<h4>Plot ${idx+1}</h4><button class="btn" style="min-width:auto; padding:5px 12px; font-size:0.8rem; background:#ff9800;" onclick="harvestCrop(${idx})">Harvest Crop</button>`;
        }
        grid.appendChild(plotCard);
    });
}

window.plantCrop = function(idx, type) {
    if (type === 'wheat' && state.farm.wheatSeeds > 0) { state.farm.wheatSeeds--; farmPlots[idx] = { condition: 'growing', type: 'wheat', progress: 0 }; }
    else if (type === 'tomato' && state.farm.tomatoSeeds > 0) { state.farm.tomatoSeeds--; farmPlots[idx] = { condition: 'growing', type: 'tomato', progress: 0 }; }
    else { return alert("No seeds left!"); }
    renderFields(); refreshUI();
    let speedBonus = 1 + (state.upgrades.hydroponics * 0.25);
    let interval = setInterval(() => {
        if (farmPlots[idx] && farmPlots[idx].condition === 'growing') {
            farmPlots[idx].progress += Math.round(10 * speedBonus);
            if (farmPlots[idx].progress >= 100) { farmPlots[idx].progress = 100; farmPlots[idx].condition = 'ready'; clearInterval(interval); }
            if (document.getElementById('farm-screen').classList.contains('active')) renderFields();
        } else { clearInterval(interval); }
    }, 800);
};

window.harvestCrop = function(idx) {
    const crop = farmPlots[idx];
    if (crop.type === 'wheat') state.farm.rawWheat += 2;
    if (crop.type === 'tomato') state.farm.rawTomato += 2;
    farmPlots[idx] = { condition: 'empty', type: '', progress: 0 };
    saveProfile(); renderFields(); refreshUI();
};

function initStockMarketLoop() {
    // FIXED: Changed update cycle interval from 3 seconds to 6 seconds to give the player time to type!
    setInterval(() => {
        let alerts = [];
        for (let name in state.stocks) {
            let asset = state.stocks[name];
            let percentChange = (Math.random() - 0.48) * 2 * asset.baseVolatility;
            if (name === 'One Piece') {
                if (Math.random() < 0.01) { percentChange = 6.0 + (Math.random() * 4.0); }
                else { percentChange = (Math.random() - 0.65) * asset.baseVolatility; }
            }
            asset.currentPrice = Math.max(0.50, asset.currentPrice * (1 + percentChange));
            asset.priceHistory.push(asset.currentPrice);
            if (asset.priceHistory.length > 15) asset.priceHistory.shift();
            if (percentChange > 0.15 && asset.held > 0) { alerts.push(`🔥 "${name}" is highly WANTED right now! Sell now for max profits!`); }
        }
        const displayAlert = document.getElementById('market-notification');
        if (displayAlert) {
            if(alerts.length > 0 && document.getElementById('stock-screen').classList.contains('active')) {
                displayAlert.innerText = alerts; displayAlert.style.display = 'block';
            } else { displayAlert.style.display = 'none'; }
        }
        if (document.getElementById('stock-screen').classList.contains('active')) updateStockPricesUIOnly();
    }, 6000);
}

function renderStockMarket() {
    const container = document.getElementById('stock-grid-container'); if (!container) return; container.innerHTML = '';
    for (let name in state.stocks) {
        let asset = state.stocks[name]; let hist = asset.priceHistory;
        let runningTrend = hist.length > 1 ? hist[hist.length - 1] >= hist[hist.length - 2] : true;
        let accentColor = runningTrend ? '#10b981' : '#ef4444';
        let id = name.replace(' ', '-');
        let card = document.createElement('div'); card.className = 'upgrade-item'; card.style.marginBottom = '15px'; card.style.borderColor = accentColor; card.id = `stock-card-${id}`;
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <div><h3 style="margin:0; color:${accentColor};" class="stock-title">${name}</h3><small class="stock-owned">Owned: ${asset.held.toFixed(2)}</small></div>
                <div style="text-align:right;"><div style="font-size:1.3rem; font-weight:bold; color:${accentColor};" class="stock-price">$${asset.currentPrice.toFixed(2)}</div>
                <small style="color:${accentColor};" class="stock-trend">${runningTrend ? '📈 WANTED' : '📉 UNWANTED'}</small></div>
            </div>
            <div style="height:40px; background:rgba(0,0,0,0.2); border-radius:4px; margin-bottom:10px;" class="stock-svg-box">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" style="width:100%; height:100%;"><polyline fill="none" stroke="${accentColor}" stroke-width="2" points="${generateSvgPoints(hist)}"/></svg>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                <div><input type="number" id="amt-buy-${id}" placeholder="Amount ($)" style="margin-bottom:5px; padding:5px;"><button class="btn" style="min-width:100%; margin:0; padding:6px; font-size:0.85rem;" onclick="tradeAsset('${name}', 'buy')">Buy</button></div>
                <div><input type="number" id="amt-sell-${id}" placeholder="Units" style="margin-bottom:5px; padding:5px;"><button class="btn" style="min-width:100%; margin:0; padding:6px; font-size:0.85rem; background:#ef4444;" onclick="tradeAsset('${name}', 'sell')">Sell</button></div>
            </div>`;
        container.appendChild(card);
    }
}

// FIXED: This fine-tuned method updates numbers/graphs dynamically WITHOUT wiping out or resetting input boxes you are typing in!
function updateStockPricesUIOnly() {
    for (let name in state.stocks) {
        let asset = state.stocks[name]; let hist = asset.priceHistory;
        let runningTrend = hist.length > 1 ? hist[hist.length - 1] >= hist[hist.length - 2] : true;
        let accentColor = runningTrend ? '#10b981' : '#ef4444';
        let id = name.replace(' ', '-');
        let card = document.getElementById(`stock-card-${id}`);
        if (card) {
            card.style.borderColor = accentColor;
            card.querySelector('.stock-owned').innerText = `Owned: ${asset.held.toFixed(2)}`;
            let priceEl = card.querySelector('.stock-price');
            priceEl.innerText = `$${asset.currentPrice.toFixed(2)}`;
            priceEl.style.color = accentColor;
            let trendEl = card.querySelector('.stock-trend');
            trendEl.innerText = runningTrend ? '📈 WANTED' : '📉 UNWANTED';
            trendEl.style.color = accentColor;
            card.querySelector('.stock-title').style.color = accentColor;
            card.querySelector('.stock-svg-box').innerHTML = `<svg viewBox="0 0 100 40" preserveAspectRatio="none" style="width:100%; height:100%;"><polyline fill="none" stroke="${accentColor}" stroke-width="2" points="${generateSvgPoints(hist)}"/></svg>`;
        }
    }
}

function generateSvgPoints(history) {
    if (history.length < 2) return "0,20 100,20";
    let min = Math.min(...history), max = Math.max(...history), range = max - min === 0 ? 1 : max - min;
    return history.map((val, idx) => { return `${(idx / (history.length - 1)) * 100},${40 - (((val - min) / range) * 32 + 4)}`; }).join(' ');
}

window.tradeAsset = function(name, action) {
    let asset = state.stocks[name], id = name.replace(' ', '-');
    if (action === 'buy') {
        let val = parseFloat(document.getElementById(`amt-buy-${id}`).value);
        if (isNaN(val) || val <= 0 || state.cash < val) return alert("Invalid amount or insufficient funds!");
        state.cash = parseFloat((state.cash - val).toFixed(2)); asset.held += (val / asset.currentPrice);
    } else {
        let units = parseFloat(document.getElementById(`amt-sell-${id}`).value);
        if (isNaN(units) || units <= 0 || asset.held < units) return alert("Invalid unit values!");
        state.cash = parseFloat((state.cash + (units * asset.currentPrice)).toFixed(2)); asset.held -= units;
    }
    document.getElementById(`amt-buy-${id}`).value = ''; document.getElementById(`amt-sell-${id}`).value = '';
    saveProfile(); refreshUI(); updateStockPricesUIOnly();
};
