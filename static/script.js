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
            
            // Backend'den gelen CV verisiyle (Scatter) grafik çiz
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

// --- GRAFİK (CV EĞRİSİ - SCATTER PLOT) ---
function drawChart(dataPoints, peakData) {
    const ctx = document.getElementById('signalChart').getContext('2d');
    if (myChart) myChart.destroy();

    // Veri yapısı: [{x: voltaj, y: akım}, ...]
    
    // Peak noktası için tek bir noktalık dataset
    const peakDataset = peakData ? [{x: peakData.x, y: peakData.y}] : [];

    myChart = new Chart(ctx, {
        type: 'scatter', 
        data: {
            datasets: [
                {
                    label: 'CV Curve (Last Cycle)',
                    data: dataPoints, // Ana sinyal
                    borderColor: '#4cc9f0',
                    backgroundColor: 'rgba(76, 201, 240, 0.1)',
                    borderWidth: 2,
                    showLine: true, // Noktaları çizgiyle birleştir
                    pointRadius: 0, // Noktaları gizle, sadece çizgi görünsün
                    fill: true,
                    tension: 0.4 
                },
                {
                    label: 'Oxidation Peak',
                    data: peakDataset, // Zirve noktası
                    borderColor: '#ff0055',
                    backgroundColor: '#ff0055',
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    showLine: false // Sadece nokta olarak göster
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Yazdırma için animasyon kapalı olmalı
            plugins: { 
                legend: { display: true, labels: { color: '#ccc' } },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            // Tooltip'te Voltaj ve Akım gösterimi
                            return `V: ${context.parsed.x.toFixed(2)} V, I: ${context.parsed.y.toExponential(2)} A`;
                        }
                    }
                }
            },
            scales: {
                x: { 
                    type: 'linear',
                    position: 'bottom',
                    title: { display: true, text: 'Potential (V)', color: '#888' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#aaa' }
                },
                y: { 
                    title: { display: true, text: 'Current (A)', color: '#888' },
                    grid: { color: 'rgba(255,255,255,0.05)' }, 
                    ticks: { color: '#aaa' } 
                }
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

function printReport() {
    try {
        // --- 1. Kütüphane Kontrolü ---
        if (typeof QRCode === 'undefined') {
            alert("HATA: QR Kütüphanesi yüklü değil. Sayfayı yenileyin.");
            return;
        }

        // --- 2. Verileri Hazırla ---
        const dateVal = new Date().toLocaleDateString();
        const rawFileName = document.getElementById('fileName').innerText || "Dosya Yok";
        // Dosya adını çok uzunsa kısaltalım
        const shortFile = rawFileName.length > 18 ? rawFileName.substring(0, 15) + "..." : rawFileName;
        const predVal = document.getElementById('resPred').innerText;
        const statusVal = document.getElementById('resStatus').innerText;

        // Rapor Alanını Doldur
        document.getElementById('pDate').innerText = new Date().toLocaleString();
        document.getElementById('pFile').innerText = rawFileName;
        document.getElementById('pPred').innerText = predVal + " mM";
        document.getElementById('pStatus').innerText = statusVal;

        // Grafiği Kopyala
        const originalCanvas = document.getElementById('signalChart');
        if(originalCanvas) {
            document.getElementById('pChartImg').src = originalCanvas.toDataURL('image/png');
        }

        // --- 3. QR KODU OLUŞTUR (HAYALET YÖNTEMİ) ---
        // Sorun: Gizli div'e QR çizilmez.
        // Çözüm: Geçici bir div oluştur, orada çiz, resmini al.
        
        // Varsa eski hayalet div'i temizle
        const oldGhost = document.getElementById("ghost-qr");
        if (oldGhost) oldGhost.remove();

        // Yeni geçici div oluştur (Ekranda görünmez ama render edilir)
        const ghostDiv = document.createElement("div");
        ghostDiv.id = "ghost-qr";
        ghostDiv.style.position = "absolute";
        ghostDiv.style.top = "-9999px"; // Ekran dışına at
        ghostDiv.style.left = "-9999px";
        document.body.appendChild(ghostDiv);

        // QR Metni
        const qrText = `RAPOR\nTarih: ${dateVal}\nDosya: ${shortFile}\nSonuc: ${predVal} mM\nDurum: ${statusVal}`;

        // QR Kodunu Hayalet Div'e Çiz
        new QRCode(ghostDiv, {
            text: qrText,
            width: 120, // Biraz daha büyük ve net olsun
            height: 120,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.L
        });

        // --- 4. Resmi Rapora Taşı ve Yazdır ---
        // QR kodun çizilmesi için minik bir bekleme süresi verelim
        setTimeout(() => {
            const qrImage = ghostDiv.querySelector("img");
            const targetContainer = document.getElementById("qrcode");
            
            if (qrImage && targetContainer) {
                targetContainer.innerHTML = ""; // Temizle
                // Resmi kopyala (cloneNode yerine src kopyalama daha güvenlidir)
                const finalImg = document.createElement("img");
                finalImg.src = qrImage.src;
                finalImg.style.width = "100px";
                finalImg.style.height = "100px";
                targetContainer.appendChild(finalImg);
            }

            // Hayalet div'i sil
            ghostDiv.remove();

            // Yazdırmayı başlat
            window.print();
        }, 500); // 500ms bekleme

    } catch (error) {
        alert("Hata: " + error.message);
    }
}