let myChart = null;

// --- GİRİŞ ---
function login() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorBox = document.getElementById('loginError');

    if(user === "mustafasen" && pass === "volkankılıc") {
        errorBox.classList.add('hidden');
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
    } else {
        errorBox.classList.remove('hidden');
        document.getElementById('password').value = "";
    }
}

function logout() { location.reload(); }

function handleFileSelect() {
    const file = document.getElementById('fileInput').files[0];
    if(file) document.getElementById('fileName').innerText = file.name;
}

// --- ANALİZ ---
async function analyzeData() {
    const file = document.getElementById('fileInput').files[0];
    const expected = document.getElementById('expectedConc').value;

    if (!file) { alert("Please select a file."); return; }

    document.getElementById('loader').classList.remove('hidden');
    document.getElementById('resultContent').classList.add('hidden');
    document.getElementById('initial-state').classList.add('hidden');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('expected_conc', expected);

    try {
        const response = await fetch('/predict', { method: 'POST', body: formData });
        const result = await response.json();

        if (response.ok) {
            document.getElementById('resPred').innerText = result.prediction;
            
            const statusElem = document.getElementById('resStatus');
            statusElem.innerText = result.status_msg;
            statusElem.style.color = result.status_color;
            statusElem.style.textShadow = `0 0 10px ${result.status_color}`;
            
            drawChart(result.chart_data, result.peak_data);
            addToHistory(file.name, result.prediction, result.status_msg);

            document.getElementById('loader').classList.add('hidden');
            document.getElementById('resultContent').classList.remove('hidden');
        } else {
            alert("Error: " + result.error);
            document.getElementById('loader').classList.add('hidden');
        }
    } catch (e) {
        console.error(e);
        alert("Server error.");
        document.getElementById('loader').classList.add('hidden');
    }
}

// --- GRAFİK ---
function drawChart(dataPoints, peakData) {
    const ctx = document.getElementById('signalChart').getContext('2d');
    if (myChart) myChart.destroy();

    const labels = dataPoints.map((_, i) => i);
    const peakDataset = new Array(dataPoints.length).fill(null);
    if(peakData) peakDataset[peakData.index] = peakData.value;

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Signal',
                    data: dataPoints,
                    borderColor: '#4cc9f0',
                    backgroundColor: 'rgba(76, 201, 240, 0.1)',
                    borderWidth: 2,
                    pointRadius: 0,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Peak',
                    data: peakDataset,
                    borderColor: '#ff0055',
                    backgroundColor: '#ff0055',
                    pointRadius: 6,
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // PDF için kritik!
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } }
            }
        }
    });
}

function addToHistory(filename, pred, status) {
    const tbody = document.getElementById('historyBody');
    const now = new Date().toLocaleTimeString();
    const row = `<tr><td>${now}</td><td>${filename}</td><td><strong>${pred} mM</strong></td><td>${status}</td></tr>`;
    tbody.insertAdjacentHTML('afterbegin', row);
}

// --- YENİ YAZDIRMA FONKSİYONU ---
function printReport() {
    // 1. Bilgileri Doldur
    document.getElementById('pDate').innerText = new Date().toLocaleDateString();
    document.getElementById('pFile').innerText = document.getElementById('fileName').innerText;
    document.getElementById('pPred').innerText = document.getElementById('resPred').innerText + " mM";
    document.getElementById('pStatus').innerText = document.getElementById('resStatus').innerText;

    // 2. Grafiği Kopyala (Canvas -> Image)
    const originalCanvas = document.getElementById('signalChart');
    const reportImg = document.getElementById('pChartImg');
    reportImg.src = originalCanvas.toDataURL('image/png');

    // 3. Yazdırma Penceresini Aç
    // Resmin yüklenmesi için minik bir gecikme
    setTimeout(() => {
        window.print();
    }, 200);
}