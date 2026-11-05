// Game State Engine Initialization
let state = {
    save_version: 2, 
    cash: 1000.00,
    dropshipping: { assets: [] },
    local: { 
        style: 'food', 
        stock: 10, 
        footTraffic: 12,
        marketingMultiplier: 1.0,
        loyaltyRating: 50, 
        totalSalesCount: 0
    },
    farm: { wheatSeeds: 5, tomatoSeeds: 3, rawWheat: 0, rawTomato: 0, preparedBread: 0, preparedPasta: 0 },
    upgrades: { copywriting: 0, pixel: 0, lights: 0, hydroponics: 0, storePromoters: 0 },
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
        if (loadedState && loadedState.save_version === 2 && typeof loadedState.cash === 'number') {
            state = { ...state, ...loadedState };
        } else {
            console.warn("Outdated or invalid save data detected. Automating master engine refresh.");
            localStorage.clear();
        }
    } catch(e) { 
        console.error("Critical execution save block. Wiping records."); 
        localStorage.clear();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    refreshUI();
    initStockMarketHTML();
    initStockMarketLoop();
    initAdvancedCanvasEngine();
    saveProfile();
});

function switchScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const targetedScreen = document.getElementById(id);
    if (targetedScreen) targetedScreen.classList.add('active');
    saveProfile();
    refreshUI();
    if (id === 'stock-screen') updateStockMarketVisuals();
    if (id === 'local-screen') updateLocalStorefrontVisuals();
}

function toggleTheme() { document.body.classList.toggle('light-theme'); }
function saveProfile() { localStorage.setItem('venturecraft_save', JSON.stringify(state)); }
function resetGame() { if(confirm("Wipe completely?")) { localStorage.clear(); location.reload(); } }
function startMode(mode) { switchScreen(`${mode}-screen`); if(mode === 'farm') renderFields(); }

function refreshUI() {
    document.querySelectorAll('.global-cash-display').forEach(el => el.innerText = state.cash.toFixed(2));
    if (document.getElementById('drop-count')) document.getElementById('drop-count').innerText = state.dropshipping.assets.length;
    if (document.getElementById('local-type-display')) document.getElementById('local-type-display').innerText = state.local.style === 'food' ? '🌮 Food Truck' : '⚡ Electronics';
    if (document.getElementById('local-inv')) document.getElementById('local-inv').innerText = state.local.stock;
    
    let dynamicTraffic = state.local.footTraffic + (state.upgrades.lights * 3) + (state.upgrades.storePromoters * 8);
    if (document.getElementById('local-traffic-display')) {
        document.getElementById('local-traffic-display').innerText = Math.round(dynamicTraffic * state.local.marketingMultiplier);
    }
    
    if (document.getElementById('farm-seeds-w')) document.getElementById('farm-seeds-w').innerText = state.farm.wheatSeeds;
    if (document.getElementById('farm-seeds-t')) document.getElementById('farm-seeds-t').innerText = state.farm.tomatoSeeds;
    if (document.getElementById('inv-wheat')) document.getElementById('inv-wheat').innerText = state.farm.rawWheat;
    if (document.getElementById('inv-tomato')) document.getElementById('inv-tomato').innerText = state.farm.rawTomato;
    if (document.getElementById('inv-bread')) document.getElementById('inv-bread').innerText = state.farm.preparedBread;
    if (document.getElementById('inv-pasta')) document.getElementById('inv-pasta').innerText = state.farm.preparedPasta;

    updateUpgradeElement('up-copy-lvl', 'up-copy-cost', state.upgrades.copywriting, 200);
    updateUpgradeElement('up-pixel-lvl', 'up-pixel-cost', state.upgrades.pixel, 350);
    updateUpgradeElement('up-lights-lvl', 'up-lights-cost', state.upgrades.lights, 250);
    updateUpgradeElement('up-hydro-lvl', 'up-hydro-cost', state.upgrades.hydroponics, 300);
    updateUpgradeElement('up-promoters-lvl', 'up-promoters-cost', state.upgrades.storePromoters || 0, 400);
}

function updateUpgradeElement(lvlId, costId, currentLvl, baseCost) {
    const lvlEl = document.getElementById(lvlId);
    const costEl = document.getElementById(costId);
    if (lvlEl) lvlEl.innerText = currentLvl;
    if (costEl) costEl.innerText = currentLvl >= 10 ? 'MAX' : (currentLvl + 1) * baseCost;
}

function buyUpgrade(type) {
    if (type === 'hydropenic' || type === 'hydroponic') type = 'hydroponics';
    if (state.upgrades[type] === undefined) state.upgrades[type] = 0;
    
    let currentLvl = state.upgrades[type];
    if (currentLvl >= 10) return alert("Max Level 10 reached!");
    
    let baseCosts = { copywriting: 200, pixel: 350, lights: 250, hydroponics: 300, storePromoters: 400 };
    let cost = (currentLvl + 1) * (baseCosts[type] || 200);
    
    if (state.cash >= cost) {
        state.cash = parseFloat((state.cash - cost).toFixed(2));
        state.upgrades[type]++;
        saveProfile(); 
        refreshUI();
        if (document.getElementById('local-screen').classList.contains('active')) updateLocalStorefrontVisuals();
    } else { 
        alert("Not enough money!"); 
    }
}

function buySeeds(type) {
    if (type === 'wheat' && state.cash >= 10) { state.cash = parseFloat((state.cash - 10).toFixed(2)); state.farm.wheatSeeds += 5; }
    else if (type === 'tomato' && state.cash >= 25) { state.cash = parseFloat((state.cash - 25).toFixed(2)); state.farm.tomatoSeeds += 3; }
    else { return alert("Not enough cash for seeds!"); }
    saveProfile(); refreshUI();
}

let drawEngine = null;
let painting = false;
let lastDrawX = 0, lastDrawY = 0;
let currentPenColor = '#000000';
let currentBrushSize = 4;

function initAdvancedCanvasEngine() {
    const board = document.getElementById('productCanvas');
    if (!board) return;
    drawEngine = board.getContext('2d');
    
    board.width = board.offsetWidth || 340; 
    board.height = board.offsetHeight || 150;
    
    function getCanvasCoordinates(e) {
        const bounds = board.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - bounds.left) * (board.width / bounds.width),
            y: (clientY - bounds.top) * (board.height / bounds.height)
        };
    }

    function startDrawing(e) {
        painting = true;
        const pos = getCanvasCoordinates(e);
        lastDrawX = pos.x;
        lastDrawY = pos.y;
        if(e.cancelable) e.preventDefault();
    }

    function draw(e) {
        if (!painting || !drawEngine) return;
        const pos = getCanvasCoordinates(e);
        
        drawEngine.beginPath();
        drawEngine.moveTo(lastDrawX, lastDrawY);
        drawEngine.lineTo(pos.x, pos.y);
        drawEngine.strokeStyle = currentPenColor;
        drawEngine.lineWidth = currentBrushSize;
        drawEngine.lineCap = 'round';
        drawEngine.lineJoin = 'round';
        drawEngine.stroke();
        
        lastDrawX = pos.x;
        lastDrawY = pos.y;
        if(e.cancelable) e.preventDefault();
    }

    function stopDrawing() {
        painting = false;
    }

    board.addEventListener('mousedown', startDrawing);
    board.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);
    board.addEventListener('mouseleave', stopDrawing);

    board.addEventListener('touchstart', startDrawing, { passive: false });
    board.addEventListener('touchmove', draw, { passive: false });
    board.addEventListener('touchend', stopDrawing);
}
/* ==========================================================================
   DROPSHIPPING & MOCKUP CANVAS TOOLS
   ========================================================================== */
function setCanvasColor(hex) { currentPenColor = hex; }
function setBrushSize(size) { currentBrushSize = parseInt(size) || 4; }
function clearCanvas() { 
    const board = document.getElementById('productCanvas');
    if(drawEngine && board) drawEngine.clearRect(0, 0, board.width, board.height); 
}

function saveProduct() {
    const tBox = document.getElementById('drop-name'), cBox = document.getElementById('drop-price'), dBox = document.getElementById('drop-desc');
    if(!tBox || !cBox || !dBox || !tBox.value || !cBox.value || !dBox.value) return alert("Fill fields!");
    const price = parseFloat(cBox.value), pitch = dBox.value.toLowerCase();
    let score = 25;
    if (pitch.length > 25) score += 20; if (pitch.length > 70) score += 20;
    if (pitch.includes("premium") || pitch.includes("luxury")) score += 15;
    score += (state.upgrades.copywriting * 15);
    let conv = score - (price / (3.0 + (state.upgrades.pixel)));
    if (conv < 6) conv = 6;
    state.dropshipping.assets.push({ title: tBox.value, cost: price, conversionChance: Math.min(conv, 95) });
    document.getElementById('drop-feed').innerHTML = `<div>[SYS] "${tBox.value}" launched (${Math.round(conv)}% chance)</div>` + document.getElementById('drop-feed').innerHTML;
    tBox.value = ''; cBox.value = ''; dBox.value = ''; clearCanvas(); saveProfile(); refreshUI();
}

setInterval(() => {
    if(state.dropshipping.assets.length > 0 && document.getElementById('dropshipping-screen').classList.contains('active')) {
        const item = state.dropshipping.assets[Math.floor(Math.random() * state.dropshipping.assets.length)];
        if(Math.random() * 100 < item.conversionChance) {
            const net = parseFloat((item.cost * 0.6).toFixed(2)); state.cash = parseFloat((state.cash + net).toFixed(2));
            document.getElementById('drop-feed').innerHTML = `<div style="color:#4caf50;">✔ Bought 1x "${item.title}" (+$${net})</div>` + document.getElementById('drop-feed').innerHTML;
        }
        refreshUI();
    }
}, 3800);

/* ==========================================================================
   1,000x MORE FUN ACTIVE MANAGEMENT STOREFRONT OPERATIONS SYSTEM
   ========================================================================== */
function changeNiche() {
    state.local.style = document.getElementById('local-niche-select').value;
    saveProfile();
    refreshUI();
    updateLocalStorefrontVisuals();
}

function buyInventory() {
    if(state.cash >= 100) {
        state.cash = parseFloat((state.cash - 100).toFixed(2));
        state.local.stock += 10;
        saveProfile();
        refreshUI();
    } else {
        alert("Not enough funds to purchase inventory bulk package.");
    }
}

function distributeFlyers() {
    state.local.marketingMultiplier = parseFloat((state.local.marketingMultiplier + 0.15).toFixed(2));
    if (state.local.marketingMultiplier > 4.0) state.local.marketingMultiplier = 4.0;
    state.local.loyaltyRating = Math.min(100, state.local.loyaltyRating + 1);

    const feed = document.getElementById('local-feed');
    if (feed) {
        feed.innerHTML = `<div style="color:#60a5fa;">📣 Handed out flyers! Local Traffic speed Multiplier at ${state.local.marketingMultiplier}x!</div>` + feed.innerHTML;
    }
    updateLocalStorefrontVisuals();
    refreshUI();
}

function updateLocalStorefrontVisuals() {
    const multEl = document.getElementById('store-multiplier-badge');
    if (multEl) multEl.innerText = state.local.marketingMultiplier.toFixed(2) + "x";

    const loyaltyEl = document.getElementById('store-loyalty-badge');
    if (loyaltyEl) loyaltyEl.innerText = (state.local.loyaltyRating || 50) + "%";

    const salesEl = document.getElementById('store-sales-count');
    if (salesEl) salesEl.innerText = state.local.totalSalesCount || 0;
}

setInterval(() => {
    if (state.local.marketingMultiplier > 1.0) {
        state.local.marketingMultiplier = parseFloat((state.local.marketingMultiplier - 0.05).toFixed(2));
        if (state.local.marketingMultiplier < 1.0) state.local.marketingMultiplier = 1.0;
        updateLocalStorefrontVisuals();
        refreshUI();
    }
}, 2000);

setInterval(() => {
    if (document.getElementById('local-screen').classList.contains('active') && state.local.stock > 0) {
        let baseTraffic = state.local.footTraffic + (state.upgrades.lights * 3) + ((state.upgrades.storePromoters || 0) * 8);
        let finalTraffic = baseTraffic * state.local.marketingMultiplier;
        let saleChance = finalTraffic * (3.5 * ((state.local.loyaltyRating || 50) / 50));
        
        if (Math.random() * 100 < saleChance) {
            state.local.stock--;
            state.local.totalSalesCount = (state.local.totalSalesCount || 0) + 1;
            if(Math.random() < 0.25) state.local.loyaltyRating = Math.min(100, (state.local.loyaltyRating || 50) + 2);
            const earn = state.local.style === 'food' ? 25.00 : 75.00;
            state.cash = parseFloat((state.cash + earn).toFixed(2));
            
            document.getElementById('local-feed').innerHTML = `<div style="color:#4caf50;">✔ Product Sold at Storefront (+$${earn}) [Loyalty: ${state.local.loyaltyRating}%]</div>` + document.getElementById('local-feed').innerHTML;
            updateLocalStorefrontVisuals();
            refreshUI();
            saveProfile();
        }
    }
}, 3000);

/* ==========================================================================
   AUTOMATED FARMING SYSTEM SECTOR
   ========================================================================== */
function renderFields() {
    const grid = document.getElementById('farmPlotsContainer'); if (!grid) return; grid.innerHTML = '';
    farmPlots.forEach((plot, idx) => {
        const card = document.createElement('div'); card.className = `plot-card ${plot.condition}`;
        if (plot.condition === 'empty') {
            card.innerHTML = `<h4>Plot ${idx + 1}</h4>
                <button class="btn" style="min-width:auto; padding:4px 8px; font-size:0.75rem;" onclick="plantCrop(${idx}, 'wheat')">Wheat</button>
                <button class="btn" style="min-width:auto; padding:4px 8px; font-size:0.75rem; background:#ff9800;" onclick="plantCrop(${idx}, 'tomato')">Tomato</button>`;
        } else if (plot.condition === 'growing') {
            card.innerHTML = `<h4>Plot ${idx+1}</h4><p style="color:#2196f3; font-size:0.85rem;">Growing (${plot.progress}%)</p>`;
        } else if (plot.condition === 'ready') {
            card.innerHTML = `<h4>Plot ${idx+1}</h4><button class="btn" style="min-width:auto; padding:5px 12px; background:#ff9800;" onclick="harvestCrop(${idx})">Harvest</button>`;
        }
        grid.appendChild(card);
    });
}

window.plantCrop = function(idx, type) {
    if (type === 'wheat' && state.farm.wheatSeeds > 0) { state.farm.wheatSeeds--; farmPlots[idx] = { condition: 'growing', type: 'wheat', progress: 0 }; }
    else if (type === 'tomato' && state.farm.tomatoSeeds > 0) { state.farm.tomatoSeeds--; farmPlots[idx] = { condition: 'growing', type: 'tomato', progress: 0 }; }
    else { return alert("No seeds!"); }
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
            state.farm.rawWheat -= 3; state.farm.preparedBread += 1;
            logFarmMessage("🍞 Baked 1x Fresh Bread!", "#38bdf8");
        } else { alert("Not enough Raw Wheat! You need 3 units."); }
    } else if (type === 'pasta') {
        if (state.farm.rawWheat >= 2 && state.farm.rawTomato >= 2) {
            state.farm.rawWheat -= 2; state.farm.rawTomato -= 2; state.farm.preparedPasta += 1;
            logFarmMessage("🍝 Cooked 1x Tomato Pasta!", "#38bdf8");
        } else { alert("Not enough ingredients! You need 2 Wheat and 2 Tomatoes."); }
    }
    saveProfile(); refreshUI();
};

window.sellFood = function(type) {
    if (type === 'bread') {
        if (state.farm.preparedBread > 0) {
            state.farm.preparedBread -= 1; state.cash = parseFloat((state.cash + 45.00).toFixed(2));
            logFarmMessage("💰 Sold 1x Fresh Bread for $45.00!", "#4caf50");
        } else { alert("You don't have any Bread to sell!"); }
    } else if (type === 'pasta') {
        if (state.farm.preparedPasta > 0) {
            state.farm.preparedPasta -= 1; state.cash = parseFloat((state.cash + 90.00).toFixed(2));
            logFarmMessage("💰 Sold 1x Tomato Pasta for $90.00!", "#4caf50");
        } else { alert("You don't have any Pasta to sell!"); }
    }
    saveProfile(); refreshUI();
};

function logFarmMessage(msg, color = "#fff") {
    const feed = document.getElementById('farm-feed');
    if (feed) feed.innerHTML = `<div style="color:${color};">[KITCHEN] ${msg}</div>` + feed.innerHTML;
}

/* ==========================================================================
   HIGH FREQUENCY ASSET EXCHANGE MECHANICS (STOCK MARKET)
   ========================================================================== */
