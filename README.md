# GlucoseDetect AI 🩸🤖

**GlucoseDetect AI**, elektrokimyasal sensörlerden alınan ham verileri işleyerek glikoz (şeker) konsantrasyonunu tahmin eden, yapay zeka destekli web tabanlı bir analiz platformudur.

Bu proje, **İzmir Kâtip Çelebi Üniversitesi Biyomedikal Mühendisliği** bölümünde yürütülen **Non-Enzimatik Glikoz Tespiti** çalışmaları kapsamında geliştirilmiştir. Araştırmacıların ve danışmanların deney sonuçlarını hızlıca analiz etmesini, görselleştirmesini ve resmi formatta raporlamasını sağlar.

## 🚀 Proje Özellikleri

* **Yapay Zeka Destekli Analiz:** Ham sinyal verilerinden (Mean, RMS, Peak Value, Std) öznitelik çıkartarak eğitilmiş Random Forest Regressor modeli (`glikoz_regressor.pkl`) üzerinden tahminleme yapar.
* **Akıllı Veri İşleme:** `.csv` ve `.xlsx` formatındaki potansiyostat verilerini otomatik okur, gürültüyü temizler ve anlamlı sinyal sütununu tespit eder.
* **Dinamik Görselleştirme:** Sinyal verilerini ve "Peak" (tepe) noktalarını interaktif grafiklerle çizer.
* **Otomatik Raporlama:** Analiz sonuçlarını, sinyal grafiğini ve numune bilgilerini içeren resmi laboratuvar raporu oluşturur ve yazdırma (PDF) seçeneği sunar.
* **Modern Arayüz:** "Glassmorphism" tasarım dili ve video arka plan ile hazırlanmış kullanıcı dostu arayüz.
* **Güvenli Giriş:** Proje danışmanları ve yetkili araştırmacılar için özel giriş sistemi.

## 🛠️ Kullanılan Teknolojiler

* **Backend:** Python 3.x, Flask
* **Veri Bilimi & AI:** Pandas, NumPy, Scikit-Learn, Joblib
* **Frontend:** HTML5, CSS3 (Modern UI), JavaScript (ES6+)
* **Görselleştirme:** Chart.js

## 📂 Proje Yapısı

```text
glucose-ai/
├── static/
│   ├── background.mp4       # Arayüz arka plan videosu
│   ├── style.css            # Glassmorphism tasarım kodları
│   └── script.js            # Frontend mantığı, grafik çizimi ve API iletişimi
├── templates/
│   └── index.html           # Ana uygulama sayfası
├── app.py                   # Flask sunucusu ve AI backend mantığı
├── glikoz_regressor.pkl     # Eğitilmiş Makine Öğrenmesi Modeli
├── requirements.txt         # Gerekli Python kütüphaneleri
└── README.md                # Proje dokümantasyonu
```

1. Projeyi Klonlayın
```bash
git clone [https://github.com/berkantaksyy/glucose-ai.git](https://github.com/berkantaksyy/glucose-ai.git)
cd glucose-ai ```

2. Sanal Ortam Oluşturun (Önerilen)
```bash
# Windows için
python -m venv venv
venv\Scripts\activate ```

# macOS/Linux için
python3 -m venv venv
source venv/bin/activate ```

3. Gerekli Kütüphaneleri Yükleyin
```bash
pip install -r requirements.txt ```

4. Uygulamayı Başlatın
```bash
python app.py ```

5. Tarayıcıda Açın
```bash
Uygulama başladığında terminalde verilen adrese gidin (genellikle): http://127.0.0.1:5000 ```


🔬 Nasıl Çalışır?
Giriş: Yetkili kullanıcı bilgileri ile sisteme giriş yapılır.

Veri Yükleme: Potansiyostat cihazından alınan ham akım verisi (.csv veya .xlsx) sisteme yüklenir.

Referans Değer (Opsiyonel): Beklenen konsantrasyon değeri girilirse sistem sapma analizi yapar.

Analiz: "RUN DIAGNOSTIC" butonuna basıldığında AI modeli veriyi işler.

Sonuç: Tahmin edilen glikoz değeri (mM), sistem durumu ve sinyal grafiği ekrana gelir. "GENERATE OFFICIAL REPORT" butonu ile sonuçlar yazdırılabilir.


👥 Ekip ve Danışmanlar
Geliştiriciler:

Berkant Aksoy - LinkedIn

Ece Ayfer

Danışmanlar:

Prof. Dr. Mustafa ŞEN

Doç. Dr. Volkan KILIÇ




