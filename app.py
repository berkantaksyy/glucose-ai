from flask import Flask, render_template, request, jsonify
import pandas as pd
import numpy as np
import joblib
import os

app = Flask(__name__)

# --- AYARLAR ---
MODEL_PATH = 'glikoz_regressor.pkl'
BIRIM_CARPANI = 18000.0 

model = None
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
    print(f"✅ Model yüklendi: {MODEL_PATH}")
else:
    print(f"❌ HATA: {MODEL_PATH} bulunamadı!")

def feature_cikart(sinyal):
    x = np.array(sinyal, dtype=float) * BIRIM_CARPANI
    return {
        "Mean": np.mean(x),
        "RMS": np.sqrt(np.mean(x**2)),
        "PeakValue": np.max(np.abs(x)),
        "Std": np.std(x),
        # Eski model uyumluluğu için gerekirse diye (Sinyal işleme özellikleri)
        "Table_sigstats/Mean": np.mean(x),
        "Table_sigstats/RMS": np.sqrt(np.mean(x**2)),
        "Table_sigstats/PeakValue": np.max(np.abs(x)),
        "Table_sigstats/Std": np.std(x)
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model dosyası eksik!'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'Dosya yüklenmedi.'}), 400
    
    file = request.files['file']
    
    # KULLANICIDAN BEKLENEN DEĞERİ AL
    try:
        expected_val = float(request.form.get('expected_conc', 0))
    except:
        expected_val = 0.0

    try:
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, sep=None, engine='python', header=None)
        else:
            df = pd.read_excel(file, header=None)
            
        # Akıllı Sütun Bulma
        sinyal = None
        min_mean = float('inf')
        
        for col_idx in range(min(df.shape[1], 5)):
            try:
                col_data = df.iloc[:, col_idx].astype(str).str.replace(',', '.').astype(float)
                col_mean = np.mean(np.abs(col_data))
                if col_mean < min_mean and col_mean > 1e-12:
                    min_mean = col_mean
                    sinyal = col_data.values
            except: continue
        
        if sinyal is None:
            return jsonify({'error': 'Akım sütunu bulunamadı.'}), 400

        # Tahmin
        feats = feature_cikart(sinyal)
        df_input = pd.DataFrame([feats])
        
        if hasattr(model, "feature_names_in_"):
            for col in model.feature_names_in_:
                if col not in df_input.columns: df_input[col] = 0.0
            df_input = df_input[model.feature_names_in_]
            
        sonuc = model.predict(df_input)[0]
        
        # --- DİNAMİK SONUÇ ANALİZİ ---
        # Kullanıcının girdiği değere göre tolerans belirle
        durum_mesaji = "Analysis Complete"
        durum_renk = "#00d2ff" # Mavi
        
        if expected_val > 0:
            fark = abs(sonuc - expected_val)
            
            # Toleranslar: ±0.3 mM (Mükemmel), ±0.6 mM (Kabul)
            if fark <= 0.3:
                durum_mesaji = "PERFECT MATCH ✅"
                durum_renk = "#00ff9d" # Yeşil
            elif fark <= 0.6:
                durum_mesaji = "ACCEPTABLE ✅"
                durum_renk = "#aaff00" # Açık Yeşil
            else:
                durum_mesaji = f"DEVIATION DETECTED (Ref: {expected_val}mM) ⚠️"
                durum_renk = "#ffcc00" # Sarı
        else:
            durum_mesaji = "Measurement Done ℹ️"

        # Grafik Verisi Hazırla
        processed_signal = sinyal * BIRIM_CARPANI
        chart_data = list(processed_signal)
        
        # Veri çok büyükse grafiği kasmamak için küçült
        if len(chart_data) > 800:
            step = len(chart_data) // 800
            chart_data = chart_data[::step]
            
        # --- PEAK NOKTASINI BUL (Grafik Üzerinde Göstermek İçin) ---
        # Küçültülmüş veri üzerindeki en yüksek (mutlak) noktayı buluyoruz
        chart_array = np.array(chart_data)
        peak_idx = np.argmax(np.abs(chart_array))
        peak_val = chart_array[peak_idx]

        return jsonify({
            'prediction': f"{sonuc:.2f}",
            'status_msg': durum_mesaji,
            'status_color': durum_renk,
            'chart_data': chart_data,
            'peak_data': {'index': int(peak_idx), 'value': float(peak_val)} # Yeni Eklenen Veri
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)