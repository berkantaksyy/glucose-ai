from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
import os
from scipy.signal import medfilt

app = Flask(__name__) # Bu hali

# --- AYARLAR ---
# Yeni modelimizin adı
MODEL_PATH = 'glikoz_modeli.pkl'

# Yeni model 4 cycle ve her cycle'da 294 nokta bekliyor
CYCLE_LEN = 294
N_CYCLES = 4
TOTAL_POINTS = CYCLE_LEN * N_CYCLES # 1176 nokta

model = None
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print(f"✅ Model başarıyla yüklendi: {MODEL_PATH}")
else:
    print(f"❌ HATA: {MODEL_PATH} bulunamadı! Lütfen model dosyasını aynı klasöre koyun.")

def prepare_signal_exact(sinyal_array):
    """
    Gelen sinyali modelin beklediği (4, 294) boyutuna getirir.
    Eksikse tamamlar, fazlaysa kırpar.
    """
    data = np.array(sinyal_array, dtype=float)
    
    # Boyut Eşitleme (1176 noktaya tamamla veya kes)
    if len(data) < TOTAL_POINTS:
        # Eksik kısımları son değerle doldur (padding)
        missing = TOTAL_POINTS - len(data)
        data = np.pad(data, (0, missing), mode='edge')
    elif len(data) > TOTAL_POINTS:
        # Fazlalığı at
        data = data[:TOTAL_POINTS]
        
    # Modelin beklediği şekle sok: (4 satır, 294 sütun)
    return data.reshape(N_CYCLES, CYCLE_LEN)

@app.route('/')
def index():
    return render_template('index.html')

# app.py içindeki predict fonksiyonunu tamamen bununla değiştir:

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model dosyası sunucuda yok!'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'Dosya yüklenmedi.'}), 400
    
    file = request.files['file']
    
    # Beklenen değer (Opsiyonel)
    try:
        expected_val = float(request.form.get('expected_conc', 0))
    except:
        expected_val = 0.0

    try:
        # Dosya Okuma
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, sep=None, engine='python', header=None)
        else:
            df = pd.read_excel(file, header=None)
            
        # --- SÜTUNLARI AYIKLA (VOLTAJ VE AKIM) ---
        # Genelde 1. sütun (Index 0) Voltaj, 2. sütun (Index 1) Akımdır.
        # Ama senin akıllı bulma kodunu koruyarak geliştirelim:
        
        voltage = None
        current = None
        min_mean = float('inf')
        current_col_idx = -1
        
        # 1. Önce AKIM sütununu bul (Ortalaması en düşük olan)
        for col_idx in range(min(df.shape[1], 5)):
            try:
                col_data = df.iloc[:, col_idx].astype(str).str.replace(',', '.').astype(float).values
                col_mean = np.mean(np.abs(col_data))
                if col_mean < min_mean and col_mean > 1e-12:
                    min_mean = col_mean
                    current = col_data
                    current_col_idx = col_idx
            except:
                continue
        
        # 2. VOLTAJ sütununu bul (Akım olmayan ilk sütun)
        if current is not None:
            for col_idx in range(df.shape[1]):
                if col_idx != current_col_idx: # Akım sütunu değilse
                    try:
                        voltage = df.iloc[:, col_idx].astype(str).str.replace(',', '.').astype(float).values
                        break # İlk bulduğumuzu voltaj varsayalım
                    except:
                        continue
        
        if current is None:
            return jsonify({'error': 'Akım verisi bulunamadı.'}), 400
            
        # Voltaj bulunamazsa yapay bir voltaj ekseni oluştur (mecburiyetten)
        if voltage is None:
            voltage = np.linspace(-1, 1, len(current))

        # --- MODEL TAHMİNİ ---
        model_input = prepare_signal_exact(current)
        preds = model.predict(model_input)
        sonuc = np.mean(preds)
        
        # --- CHART İÇİN VERİ HAZIRLIĞI (CV EĞRİSİ) ---
        # Sadece SON DÖNGÜYÜ (Last Cycle) alacağız. En temiz görüntü oradadır.
        # Filtreleme uygulayalım ki grafik pürüzsüz görünsün.
        current_filtered = medfilt(current, kernel_size=15)
        
        # Veri boyutunu eşitle (Kesme/Doldurma)
        target_len = TOTAL_POINTS # 1176
        
        if len(current_filtered) > target_len:
            c_plot = current_filtered[:target_len]
            v_plot = voltage[:target_len]
        else:
            # Eksikse padding yapmayalım, olduğu kadarını çizelim (görsellik bozulmasın)
            c_plot = current_filtered
            v_plot = voltage[:len(c_plot)]

        # Son 294 noktayı (Son Cycle) al
        cycle_len = 294
        if len(c_plot) >= cycle_len:
            last_cycle_current = c_plot[-cycle_len:] # Son 294 akım
            last_cycle_voltage = v_plot[-cycle_len:] # Son 294 voltaj
        else:
            last_cycle_current = c_plot
            last_cycle_voltage = v_plot

        # Chart.js formatına çevir: [{x: voltaj, y: akım}, ...]
        chart_data = []
        max_current = -float('inf')
        peak_idx = 0
        
        for i in range(len(last_cycle_current)):
            val = float(last_cycle_current[i])
            vol = float(last_cycle_voltage[i])
            chart_data.append({'x': vol, 'y': val})
            
            # Peak bul (En yüksek akım noktası)
            if val > max_current:
                max_current = val
                peak_idx = i

        peak_point = chart_data[peak_idx] # Zirve noktası koordinatı

        # --- DURUM MESAJI ---
        durum_mesaji = "Analiz Tamamlandı"
        durum_renk = "#00d2ff"
        
        if expected_val > 0:
            fark = abs(sonuc - expected_val)
            if fark <= 0.35:
                durum_mesaji = "PERFECT MATCH ✅"
                durum_renk = "#00ff9d"
            elif fark <= 0.8:
                durum_mesaji = "ACCEPTABLE ✅"
                durum_renk = "#aaff00"
            else:
                durum_mesaji = f"DEVIATION EXISTS (Ref: {expected_val}mM) ⚠️"
                durum_renk = "#ffcc00"
        else:
            durum_mesaji = "Measurement Complete ℹ️"

        return jsonify({
            'prediction': f"{sonuc:.2f}",
            'status_msg': durum_mesaji,
            'status_color': durum_renk,
            'chart_data': chart_data, # Artık {x, y} objesi gönderiyoruz
            'peak_data': peak_point
        })

    except Exception as e:
        print(f"Hata detayı: {e}")
        return jsonify({'error': f"İşlem hatası: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)