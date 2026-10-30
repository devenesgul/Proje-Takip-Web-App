# 🏗️ Proje Takip Web Uygulaması: Proje Belgesi (PROJECT.md)

> **Bu dosya nedir?**
> Uygulamanın tek doğruluk kaynağıdır (single source of truth). VS Code içinde Claude (Claude Code veya eklenti) ile çalışırken bu dosya projenin kökünde durur ve yapay zekâya "ne yapıyoruz, nasıl yapıyoruz, neye dikkat ediyoruz" bilgisini verir.
> Dosyayı projenin kök klasörüne `CLAUDE.md` adıyla da kopyalayabilirsiniz. Claude Code bu dosyayı oturum başında otomatik okur.

---

## İçindekiler

1. [Proje Özeti ve Amaç](#1-proje-özeti-ve-amaç)
2. [Kaynak Belge Analizi (Örnek PDF)](#2-kaynak-belge-analizi-örnek-pdf)
3. [Temel Kavramlar ve Hesaplama Mantığı](#3-temel-kavramlar-ve-hesaplama-mantığı)
4. [Özellik Listesi](#4-özellik-listesi)
5. [Veri Modeli](#5-veri-modeli)
6. [Teknoloji Yığını](#6-teknoloji-yığını)
7. [Mimari ve Klasör Yapısı](#7-mimari-ve-klasör-yapısı)
8. [Arayüz Tasarımı](#8-arayüz-tasarımı)
9. [Yol Haritası (Aşamalar ve Görev Listeleri)](#9-yol-haritası-aşamalar-ve-görev-listeleri)
10. [Kabul Kriterleri](#10-kabul-kriterleri)
11. [Kenar Durumlar ve Riskler](#11-kenar-durumlar-ve-riskler)
12. [Yapay Zekâ ile Çalışma Kuralları](#12-yapay-zekâ-ile-çalışma-kuralları)
13. [Aşama Bazlı Hazır Komutlar (Prompt'lar)](#13-aşama-bazlı-hazır-komutlar-promptlar)
14. [Açık Sorular ve Kararlar](#14-açık-sorular-ve-kararlar)
15. [Sözlük](#15-sözlük)

---

## 1. Proje Özeti ve Amaç

### 1.1 Tek cümlelik tanım
Bir projenin (başlangıçta inşaat işi) **iş programını** tek ekranda gösteren, düzenlenebilen, ilerlemeyi **ağırlıklı yüzde** ile otomatik hesaplayan, **ücretsiz ve kişisel kullanım için** bir web uygulaması.

### 1.2 Neden yapıyoruz?
Elimizdeki örnek belge, kâğıt/PDF üzerinde duran statik bir iş programı (Gantt + pursantaj tablosu). Sorunları:

| Sorun | Çözümümüz |
|---|---|
| Statik, tıklanıp güncellenemez | Canlı, düzenlenebilir tablo |
| Sadece planı gösterir, gerçekleşeni göstermez | Planlanan vs. gerçekleşen |
| Not, saat, ek bilgi alanı yok | Notlar, tarih+saat, özel sütunlar |
| Genel ilerleme elle hesaplanır | Otomatik hesaplanır |
| Bir bakışta durum anlaşılmaz | Özet panel, renkli durumlar, grafikler |

### 1.3 Hedef kullanıcı
- **Birincil:** Projeyi kendisi takip eden tek kişi (proje sahibi/geliştirici).
- **İkincil (ileride):** Paylaşılan görünüm (salt okunur link veya bulut senkron).

### 1.4 Başarı ölçütü
> Uygulamayı açtığımda **5 saniye içinde** projenin genel ilerlemesini, geciken işleri ve bu hafta yapılacakları görebilmeliyim.

### 1.5 Kısıtlar
- **Maliyet: 0 TL.** Ücretli servis, ücretli API yok.
- Sunucu gerektirmeden çalışmalı (statik site).
- Türkçe arayüz.
- Telefonda da kullanılabilir olmalı.
- İnternet yokken de açılıp çalışabilmeli (çevrimdışı), ileri aşamada.

### 1.6 Kapsam dışı (şimdilik)
- Çok kullanıcılı gerçek zamanlı ortak düzenleme
- Hakediş/maliyet/bütçe hesapları
- Kullanıcı girişi (login)
- Mobil native uygulama (iOS/Android); web uygulaması telefonda PWA olarak çalışacak

---

## 2. Kaynak Belge Analizi (Örnek PDF)

Örnek belge: **"Kentsel Dönüşüm İş Programı"**, bir kat karşılığı inşaat işinin zaman çizelgesi.

### 2.1 Belgenin bölümleri

```
┌───────────────────────────────────────────────────────────────┐
│ 1. ÜST BİLGİ BLOĞU                                            │
│    İdarenin adı, işin adı, yüklenici, ihale tarihi ve         │
│    IKN no, sözleşme tarihi, yer teslim/ruhsat tarihi,         │
│    finansman bedeli, iş bitim tarihi, işin süresi             │
├───────────────────────────────────────────────────────────────┤
│ 2. İŞ KISIMLARI + PURSANTAJ ORANI (sol sütunlar)              │
│    Ana gruplar, her biri toplam ilerlemede bir ağırlığa sahip │
├───────────────────────────────────────────────────────────────┤
│ 3. İMALAT KALEMLERİ + PURSANTAJ ORANI                         │
│    Her grubun altındaki detay işler ve kendi ağırlıkları      │
├───────────────────────────────────────────────────────────────┤
│ 4. ZAMAN EKSENİ (sağ taraf)                                   │
│    Yıl → Ay → Ayın 4 haftası. Her kalem için çubuk            │
├───────────────────────────────────────────────────────────────┤
│ 5. İŞE BAŞLAMA ve İŞİN BİTİM TARİHİ işaretleri                │
├───────────────────────────────────────────────────────────────┤
│ 6. ONAY BLOĞU                                                 │
│    Yüklenici, İdare, Mimar, İnşaat Müh., Mali/İdari İşler     │
└───────────────────────────────────────────────────────────────┘
```

### 2.2 Örnekten çıkan iş kısımları (grup) listesi
Belgede geçen ana gruplar: **Kaba İnşaat, Çatı, Doğrama, İç Sıva, Dış Cephe Yalıtım, Mekanik Tesisat (Sıhhi), Mekanik Tesisat (Isıtma/Havalandırma), Elektrik Tesisatı, Asansör İmalatı, Döşeme ve Duvar Kaplaması, Boya ve Asma Tavan, Mobilya, Çevre Düzenlemesi, İskan Ruhsatı.**

### 2.3 Örnekten çıkan imalat kalemleri (alt iş) örnekleri
Temel (hafriyat, zemin iyileştirme, temel betonu), Kat betonları, Duvar, Pencere ve balkon doğramaları, Kaba sıva, İnce sıva, Dış cephe, Çatı kaplaması, Çatı-temel su ve ısı yalıtımı, İç boya, Parke/seramik/mermer kaplama, Mutfak/banyo dolabı ve tezgâhı, Kablo çekimi, Pano/tablo/sayaç, Trafo-jeneratör, Sıhhi tesisat montajı, Yangın tesisatı, Asansör ray/kapı/kabin montajı, Çevre düzenlemesi, İskan ruhsatı vb.

> ⚠️ **Not:** PDF'ten metin çıkarılınca tablo yapısı dağıldığı için bazı yüzdelerin hangi gruba ait olduğu kesin eşleştirilemedi. Örnek veri hazırlarken orijinal PDF'e bakılarak elle doğrulanmalıdır. Yeni projede kullanıcı kendi kalemlerini girecektir.

### 2.4 Örnekteki üst bilgi alanları (uygulamada "proje künyesi")

| Alan | Örnek değer |
|---|---|
| İdarenin adı | (kurum adı) |
| İşin adı | (iş tanımı) |
| Yüklenici | (firma adı) |
| İhale tarihi ve IKN no | 7.05.2026 / İHALE-İNŞ-2026/1 |
| Sözleşme tarihi | 4.06.2026 |
| Yer teslim ve ilk yapı ruhsat tarihi | 30.04.2026 |
| Finansman bedeli | 121.000.000,00 TL |
| İşe başlama tarihi | 24.07.2026 |
| İş bitim tarihi | 13.07.2028 |
| İşin süresi | 720 gün |

Uygulamada bu alanlar **düzenlenebilir ve sütun gibi eklenip çıkarılabilir** olmalı (sabit değil).

---

## 3. Temel Kavramlar ve Hesaplama Mantığı

### 3.1 Benzetme: Pasta
Projeyi bir pasta gibi düşünün. **Her iş kalemi bir dilim**, dilimin büyüklüğü **ağırlığı (pursantaj)**. Bir dilimin ne kadarının yapıldığı **tamamlanma oranı**. Pastanın ne kadarının bittiği, tüm dilimlerin yapılan kısımlarının toplamıdır.

```
        ┌──────────── PROJE = %100 ────────────┐
        │  Temel   │ Kat Betonu │ Duvar │ ...  │
        │   %8     │    %25     │  %5   │      │
        │ ██████   │ ████░░░░   │ ██░░  │      │
        │ %100 bit.│  %50 bit.  │ %50   │      │
        └──────────────────────────────────────┘
        Genel ilerleme = 8×1,0 + 25×0,5 + 5×0,5 + ... 
```

### 3.2 Formüller

**Genel ilerleme (proje düzeyi):**
```
GenelİlerlemeYüzde = Σ ( kalem.ağırlık × kalem.tamamlanma / 100 )
```
Burada kalem ağırlıkları **proje genelinde mutlak yüzdedir** (PDF'teki gibi); toplamları %100 olmalıdır.

**Grup ilerlemesi:**
```
GrupAğırlığı     = Σ kalem.ağırlık      (grubun altındaki kalemlerin toplamı, otomatik)
GrupTamamlanma%  = Σ (kalem.ağırlık × kalem.tamamlanma) / GrupAğırlığı
```

**Ağırlık doğrulaması:**
```
Σ tüm kalem ağırlıkları = 100  → ✔ yeşil
Σ ≠ 100                         → ⚠ uyarı (farkı göster: "%3,5 eksik" / "%2 fazla")
```

**Planlanan ilerleme (S-eğrisi için, belirli bir t tarihinde):**
Her kalemin planlanan ilerlemesi, planlanan başlangıç ve bitişi arasında **doğrusal** varsayılır:
```
kalemPlan(t) = 0                                      , t <= plan.başlangıç
             = (t - plan.başlangıç) / (plan.bitiş - plan.başlangıç) , arada
             = 1                                      , t >= plan.bitiş

PlanlananGenel(t) = Σ ( kalem.ağırlık × kalemPlan(t) )
```

**Gerçekleşen ilerleme (S-eğrisi için):**
Her ilerleme güncellemesinde bir **kayıt (snapshot)** tutulur: `{tarih, genelİlerleme}`. Gerçekleşen eğri bu kayıtlardan çizilir.

**Gecikme tespiti:**
```
Geciken = (planlanan bitiş < şimdi) VE (tamamlanma < 100) VE (durum ≠ Bitti)
```

**Sapma:**
```
Sapma = GerçekleşenGenel(bugün) − PlanlananGenel(bugün)
(+) öndeyiz, (−) gerideyiz
```

**Kalan gün:**
```
KalanGün = proje.bitiş − bugün   (gün cinsinden, negatifse "X gün gecikti")
```

### 3.3 Durum etiketleri

| Durum | Anlamı | Renk önerisi |
|---|---|---|
| Başlamadı | Henüz başlama tarihi gelmedi veya başlanmadı | Gri |
| Devam ediyor | Tamamlanma 0–99 arası | Mavi |
| Bitti | %100 | Yeşil |
| Gecikti | Bitiş tarihi geçmiş, bitmemiş | Kırmızı |
| Beklemede | Bilerek durdurulmuş | Sarı/Turuncu |

Durum **otomatik önerilir** (yüzdeden ve tarihten), kullanıcı elle değiştirebilir (özellikle "Beklemede").

---

## 4. Özellik Listesi

Öncelik: **P0** = olmazsa olmaz, **P1** = önemli, **P2** = güzel olur, **P3** = ileride.

### 4.1 Çekirdek

| # | Özellik | Öncelik |
|---|---|---|
| 1 | Proje künyesi (üst bilgi alanları) düzenleme | P0 |
| 2 | Grup ve kalem ağacı (aç/kapat) | P0 |
| 3 | Kalem ekle/sil/düzenle/kopyala | P0 |
| 4 | Ağırlık, başlangıç, bitiş, tamamlanma alanları | P0 |
| 5 | Ağırlıklı genel ilerleme hesabı | P0 |
| 6 | Ağırlık toplamı doğrulaması | P0 |
| 7 | Otomatik kayıt (tarayıcıda) | P0 |
| 8 | JSON yedek: dışa aktar / içe aktar | P0 |
| 9 | Gantt çizelgesi (çubuk görünümü) | P0 |
| 10 | "Bugün" çizgisi | P0 |

### 4.2 Kullanıcının istediği esneklik

| # | Özellik | Öncelik |
|---|---|---|
| 11 | Başlangıç/bitiş için **tarih + saat** | P0 |
| 12 | Her kaleme **not** alanı (uzun metin) | P0 |
| 13 | **Özel sütun ekleme/silme/yeniden adlandırma/sıralama/gizleme** | P0 |
| 14 | Özel sütun tipleri: metin, sayı, tarih, seçenek listesi, onay kutusu, bağlantı | P1 |
| 15 | Durum etiketleri ve renkleri | P0 |
| 16 | Planlanan vs. gerçekleşen (iki katmanlı çubuk) | P1 |
| 17 | Satır içi düzenleme (hücreye tıkla, yaz) | P0 |
| 18 | Etiket (tag) sistemi | P2 |

### 4.3 Bir bakışta kontrol paneli

| # | Özellik | Öncelik |
|---|---|---|
| 19 | Özet kartlar: genel ilerleme, kalan gün, geciken iş sayısı, bu hafta yapılacaklar | P0 |
| 20 | Geciken işler otomatik kırmızı | P0 |
| 21 | S-Eğrisi (planlanan vs. gerçekleşen) | P1 |
| 22 | Grup bazlı ilerleme çubukları | P1 |
| 23 | "Bu hafta / Önümüzdeki 7 gün / Gecikenler" hızlı filtreleri | P1 |
| 24 | Yaklaşan teslim listesi | P2 |

### 4.4 Rahat kullanım

| # | Özellik | Öncelik |
|---|---|---|
| 25 | Arama ve filtre (durum, grup, tarih aralığı) | P1 |
| 26 | Sürükle-bırak ile sıralama | P1 |
| 27 | Gantt'ta çubuğu sürükleyerek tarih değiştirme | P2 |
| 28 | Geri al / Yinele (Undo/Redo) | P1 |
| 29 | Açık / Koyu tema | P1 |
| 30 | Mobil uyumlu arayüz | P1 |
| 31 | Gantt zoom: Gün / Hafta / Ay | P1 |
| 32 | Yazdırma/PDF çıktısı (PDF'teki gibi imza bloklu) | P1 |
| 33 | Excel (.xlsx) dışa aktarım | P2 |
| 34 | Klavye kısayolları | P3 |

### 4.5 İleri seviye

| # | Özellik | Öncelik |
|---|---|---|
| 35 | Bağımlılıklar (A bitmeden B başlamasın) | P3 |
| 36 | Birden fazla proje | P2 |
| 37 | PWA (ana ekrana ekle, çevrimdışı) | P2 |
| 38 | Bulut senkron (Supabase/Firebase ücretsiz katman) | P3 |
| 39 | Hatırlatma/bildirim | P3 |
| 40 | Fotoğraf/dosya ekleme | P3 |
| 41 | Değişiklik geçmişi (kim neyi ne zaman değiştirdi) | P3 |
| 42 | Salt okunur paylaşım linki | P3 |

---

## 5. Veri Modeli

### 5.1 Görsel şema

```
PROJE
 ├─ id, ad, açıklama
 ├─ başlangıç (ISO), bitiş (ISO)
 ├─ künye: [ {anahtar, değer} ... ]          ← üst bilgi alanları
 ├─ sütunTanımları: [ ... ]                   ← özel sütunlar BURADA tanımlanır
 ├─ gruplar: [
 │     GRUP
 │      ├─ id, ad, renk, sıra, açık/kapalı
 │      └─ kalemler: [
 │            KALEM
 │             ├─ id, ad, sıra
 │             ├─ ağırlık (mutlak %)
 │             ├─ plan: { başlangıç, bitiş }        (tarih+saat)
 │             ├─ gerçek: { başlangıç, bitiş }      (tarih+saat, boş olabilir)
 │             ├─ tamamlanma (0–100)
 │             ├─ durum
 │             ├─ not (metin)
 │             ├─ etiketler: [..]
 │             └─ özel: { sütunId: değer }          ← özel sütun DEĞERLERİ
 │         ]
 │   ]
 ├─ ilerlemeKayıtları: [ {tarih, genelİlerleme} ]   ← gerçekleşen S-eğrisi için
 └─ ayarlar: { tema, gösterilenSütunlar, ganttZoom, ... }
```

### 5.2 TypeScript tipleri (referans)

```ts
type ISODateTime = string; // "2026-07-24T08:00" (yerel zaman, saat dilimi eki yok)

type Durum = 'baslamadi' | 'devam' | 'bitti' | 'gecikti' | 'beklemede';

type SutunTipi = 'metin' | 'sayi' | 'tarih' | 'secim' | 'onay' | 'baglanti';

interface SutunTanimi {
  id: string;
  ad: string;
  tip: SutunTipi;
  secenekler?: { deger: string; renk?: string }[]; // tip === 'secim' ise
  gorunur: boolean;
  sira: number;
  genislik?: number;
}

interface Kalem {
  id: string;
  ad: string;
  sira: number;
  agirlik: number;               // proje genelinde mutlak yüzde
  plan: { baslangic?: ISODateTime; bitis?: ISODateTime };
  gercek: { baslangic?: ISODateTime; bitis?: ISODateTime };
  tamamlanma: number;            // 0..100
  durum: Durum;
  durumElle?: boolean;           // kullanıcı elle seçtiyse otomatik öneri ezmesin
  not?: string;
  etiketler?: string[];
  ozel: Record<string, string | number | boolean | null>;
}

interface Grup {
  id: string;
  ad: string;
  renk: string;
  sira: number;
  acik: boolean;
  kalemler: Kalem[];
}

interface IlerlemeKaydi {
  tarih: ISODateTime;
  genelIlerleme: number;
}

interface Proje {
  id: string;
  ad: string;
  aciklama?: string;
  baslangic: ISODateTime;
  bitis: ISODateTime;
  kunye: { anahtar: string; deger: string }[];
  sutunlar: SutunTanimi[];
  gruplar: Grup[];
  ilerlemeKayitlari: IlerlemeKaydi[];
  ayarlar: {
    tema: 'acik' | 'koyu' | 'sistem';
    ganttZoom: 'gun' | 'hafta' | 'ay';
    // ...
  };
  surum: number; // şema sürümü, ileride veri taşıma (migration) için
}
```

### 5.3 Tasarım kararları

1. **Sütun tanımı ile sütun değeri ayrıdır.** Yeni sütun eklemek = `sutunlar` listesine satır eklemek. Kalemlerin `ozel` alanı sütun `id`'sine göre değer tutar. Kod değişmez.
2. **ID'ler rastgele ve sabittir** (`crypto.randomUUID()`), sıra numarasına bağlı değildir.
3. **Tarihler ISO metin olarak saklanır**, ekranda Türkçe biçimde (gg.aa.yyyy SS:dd) gösterilir. Saat dilimi karmaşasından kaçınmak için yerel zaman kullanılır.
4. **Şema sürümü (`surum`)** vardır: yedek dosyasını içe aktarırken eski sürüm yeni yapıya dönüştürülebilsin.
5. **Grup ağırlığı saklanmaz, hesaplanır** (kalemlerin toplamı). Böylece tutarsızlık oluşmaz.
6. **Durum**, yüzde ve tarihten otomatik önerilir; `durumElle` ile kullanıcı kilitleyebilir.

---

## 6. Teknoloji Yığını

> Bu bölüm **varsayılan öneridir**. Aşama 0'da onaylanır veya değiştirilir.

| Katman | Seçim | Gerekçe |
|---|---|---|
| Derleme aracı | **Vite** | Hızlı, basit, statik çıktı verir |
| Arayüz | **React + TypeScript** | Bileşen yapısı büyümeye uygun; tip güvenliği yapay zekâ ile geliştirirken hata yakalar |
| Durum yönetimi | **Zustand** | Küçük, basit, undo/redo eklemesi kolay |
| Veri saklama | **IndexedDB** (`idb-keyval`) veya `localStorage` | Sunucu yok, ücret yok |
| Stil | **Tailwind CSS** veya düz CSS (CSS değişkenleri ile tema) | Hızlı, tutarlı |
| Tarih işlemleri | **date-fns** (+ `tr` locale) | Hafif, Türkçe desteği var |
| Grafik | **Recharts** (S-eğrisi, çubuk grafik) | React ile uyumlu |
| Sürükle-bırak | **dnd-kit** | Erişilebilir, React uyumlu |
| Excel çıktısı | **SheetJS (xlsx)** | Ücretsiz |
| PDF çıktısı | Tarayıcı yazdırma (`@media print` CSS) | Ek kütüphane gerekmez |
| Test | **Vitest** (hesaplama fonksiyonları için) | Formül hatalarını erken yakalar |
| Yayın | **GitHub Pages** / Cloudflare Pages / Netlify | Ücretsiz, link ile erişim |
| Bulut (ileride) | Supabase / Firebase ücretsiz katman | Gerekirse |

### 6.1 Alternatif (daha basit) yol
Eğer React karmaşık gelirse: **tek `index.html` + Vanilla JS**. Hızlı başlar ama proje büyüdükçe düzen zorlaşır. Karar Aşama 0'da verilir.

### 6.2 Neden "backend yok"?
Veri tarayıcıda durur. Avantaj: sıfır maliyet, hızlı, basit. Dezavantaj: veri o cihaza bağlıdır. Bu yüzden **JSON yedek** zorunludur (P0).

---

## 7. Mimari ve Klasör Yapısı

### 7.1 Katmanlar

```
┌──────────────────────────────────────────┐
│  UI (React bileşenleri)                  │  ← sadece görüntü ve kullanıcı etkileşimi
├──────────────────────────────────────────┤
│  Store (Zustand)                         │  ← uygulama durumu, aksiyonlar, undo/redo
├──────────────────────────────────────────┤
│  Domain / Hesaplama (saf fonksiyonlar)   │  ← ilerleme, gecikme, S-eğrisi, doğrulama
├──────────────────────────────────────────┤
│  Depolama (storage)                      │  ← IndexedDB/localStorage, JSON içe/dışa aktarım
└──────────────────────────────────────────┘
```

**Kural:** Hesaplama (domain) katmanı **React'ten bağımsız saf fonksiyonlardır** ve test edilir. UI içine formül gömülmez.

### 7.2 Önerilen klasör yapısı

```
proje-takip/
├─ CLAUDE.md                  ← bu belgenin kopyası (yapay zekâ için)
├─ PROJECT.md                 ← bu belge
├─ README.md
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ index.html
├─ public/
│   └─ (ikonlar, manifest.webmanifest)
└─ src/
    ├─ main.tsx
    ├─ App.tsx
    ├─ types/
    │   └─ index.ts            ← Proje, Grup, Kalem, SutunTanimi ...
    ├─ domain/                 ← SAF FONKSİYONLAR (test edilir)
    │   ├─ progress.ts         ← genel/grup ilerleme, ağırlık doğrulama
    │   ├─ schedule.ts         ← gecikme, kalan gün, durum önerisi
    │   ├─ scurve.ts           ← planlanan/gerçekleşen eğri verisi
    │   ├─ columns.ts          ← özel sütun yardımcıları
    │   └─ __tests__/
    ├─ store/
    │   ├─ projectStore.ts     ← Zustand store
    │   └─ history.ts          ← undo/redo
    ├─ storage/
    │   ├─ persist.ts          ← otomatik kayıt/okuma
    │   ├─ exportJson.ts
    │   ├─ importJson.ts       ← doğrulama + şema taşıma (migration)
    │   └─ exportExcel.ts
    ├─ components/
    │   ├─ layout/             ← Üst bar, yan panel
    │   ├─ dashboard/          ← Özet kartlar, S-eğrisi, uyarılar
    │   ├─ table/              ← Ağaç tablo, hücre editörleri
    │   ├─ gantt/              ← Zaman ekseni, çubuklar, bugün çizgisi
    │   ├─ columns/            ← Sütun yöneticisi
    │   ├─ notes/              ← Not paneli
    │   └─ common/             ← Düğme, modal, tarih-saat seçici
    ├─ utils/
    │   ├─ date.ts             ← biçimlendirme, Türkçe tarih
    │   └─ id.ts
    ├─ styles/
    │   ├─ tokens.css          ← renk/tema değişkenleri
    │   └─ print.css           ← yazdırma düzeni
    └─ data/
        └─ sampleProject.ts    ← örnek veri (PDF'ten esinli)
```

---

## 8. Arayüz Tasarımı

### 8.1 Ana ekran düzeni

```
┌────────────────────────────────────────────────────────────────────┐
│ ☰  [Proje Adı]        🔍 Ara   [+ Kalem] [+ Sütun] [⤓ Dışa] 🌙     │
├────────────────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐        │
│ │  %42,5     │ │  310 gün   │ │  3 geciken │ │  5 iş bu   │        │
│ │ ilerleme   │ │   kalan    │ │    iş      │ │   hafta    │        │
│ │ ████░░░░   │ │            │ │    🔴      │ │            │        │
│ └────────────┘ └────────────┘ └────────────┘ └────────────┘        │
├────────────────────────────────────────────────────────────────────┤
│ [Tümü] [Bu hafta] [Gecikenler] [Devam eden]        Zoom: [G][H][A] │
├──────────────────────────────────────┬─────────────────────────────┤
│ TABLO                                │ GANTT                       │
│ Kalem      │Ağır│Başl. │Bitiş │ % │Dur│ Eki   Kas   Ara   Oca      │
│ ▼ Kaba İns│ 40%│      │      │60%│   │ ███████████░░░░            │
│    Temel   │ 8% │10.10 │25.10 │100│ ✔ │ ███                        │
│    Kat Bet.│25% │26.10 │20.12 │50 │ ▶ │    ██|██░░                 │
│ ▶ Doğrama  │ 8% │      │      │ 0 │   │            ░░░░            │
│                                         bugün ─┘                   │
├──────────────────────────────────────┴─────────────────────────────┤
│ S-EĞRİSİ     planlanan ┈┈┈  gerçekleşen ━━━                        │
│ %100 ┤                                    ╱                        │
│      │                           ╱┈┈┈┈┈┈┈                         │
│   %0 └────────────────────────────────────                         │
└────────────────────────────────────────────────────────────────────┘
```

### 8.2 Ekranlar ve paneller

| Ekran/Panel | İçerik |
|---|---|
| **Ana görünüm** | Özet kartlar + tablo + Gantt + grafik |
| **Kalem detay paneli** (yandan açılır) | Tüm alanlar, uzun not, planlanan/gerçekleşen tarihler, özel sütun değerleri |
| **Sütun yöneticisi** (modal) | Sütun listesi, ekle/sil/sırala/gizle, tip seçimi |
| **Künye düzenleme** (modal) | Proje üst bilgi alanları |
| **Yedek/İçe-Dışa aktar** (modal) | JSON indir/yükle, Excel indir, yazdır |
| **Ayarlar** | Tema, varsayılan zoom, tarih biçimi |

### 8.3 Tasarım ilkeleri
1. **Bilgi yoğunluğu yüksek ama temiz.** İlerlemeyi renk ve çubukla anlat, yazıyla boğma.
2. **Renk anlamlıdır:** yeşil=bitti, mavi=devam, gri=başlamadı, kırmızı=gecikti, sarı=beklemede.
3. **Her şey tek tıkla düzenlenir.** Hücreye tıkla → yaz → Enter.
4. **Tablo ve Gantt aynı satır yüksekliğinde hizalıdır,** birlikte kayar (senkron scroll).
5. **Mobilde** tablo ve Gantt sekmeye ayrılır (Tablo | Gantt | Panel).
6. **Erişilebilirlik:** yeterli kontrast, klavye ile gezinme, renk dışında simge/yazı ile de durum belirtme.
7. **Türkçe arayüz;** tarih biçimi `gg.aa.yyyy SS:dd`, sayı biçimi `1.234,56`.

### 8.4 Yazdırma düzeni
PDF'teki gibi: üstte künye bloğu, ortada tablo+Gantt, altta imza alanları (Yüklenici, İdare, Mimar, İnşaat Müh., Mali/İdari). `@media print` ile A3/A4 yatay.

---

## 9. Yol Haritası (Aşamalar ve Görev Listeleri)

```
AŞAMA 0 ─► AŞAMA 1 ─► AŞAMA 2 ─► AŞAMA 3 ─► AŞAMA 4 ─► AŞAMA 5 ─► AŞAMA 6
Kurulum   İskelet    Gantt &    Özelleştir  Panel &    Cila &     İleri
& Karar   & Tablo    İlerleme   & Notlar    Grafik     Yayın      Özellikler
```

> Her aşamanın sonunda **çalışan, denenebilir** bir sürüm olmalıdır. Aşama bitmeden sonrakine geçilmez.

---

### AŞAMA 0: Kurulum ve Kararlar
**Amaç:** Geliştirme ortamı hazır, kararlar net, örnek veri hazır.

- [x] Yeni proje klasörü oluştur, Git başlat (`git init`)
- [x] Bu belgeyi `PROJECT.md` ve `CLAUDE.md` olarak koy
- [x] Teknoloji yığınını onayla (Bölüm 6)
- [x] Vite + React + TypeScript iskeletini kur
- [x] ESLint, Prettier, Vitest kur
- [x] Klasör yapısını oluştur (Bölüm 7.2)
- [x] `types/index.ts` içine veri modeli tiplerini yaz
- [x] `data/sampleProject.ts` içine örnek proje verisini hazırla (PDF'ten esinli, ağırlıklar toplamı = 100)
- [x] GitHub'a push et (yedek ve ileride yayın için)

**Çıktı:** Boş ama çalışan uygulama (`npm run dev`), tipler hazır, örnek veri hazır.

---

### AŞAMA 1: İskelet ve Temel Tablo
**Amaç:** Veri girebildiğim, kaydedilen, kaybolmayan tablo.

- [x] Zustand store: proje durumu, aksiyonlar (ekle/sil/güncelle grup ve kalem)
- [x] Otomatik kayıt (IndexedDB/localStorage) ve açılışta yükleme
- [x] JSON dışa aktar / içe aktar (doğrulama ile)
- [x] Ağaç tablo: grup satırı (aç/kapat) + kalem satırları
- [x] Satır içi düzenleme: ad, ağırlık, başlangıç, bitiş, tamamlanma
- [x] Kalem/grup ekleme, silme (onay ile), kopyalama
- [x] Proje künyesi düzenleme modalı
- [x] Temel stil, açık/koyu tema altyapısı (CSS değişkenleri)
- [x] Domain: `progress.ts` (genel ilerleme, grup ilerleme, ağırlık toplamı) **+ birim testleri**
- [x] Üstte genel ilerleme çubuğu ve ağırlık uyarısı

**Çıktı:** Tabloyu doldurup sayfayı yenilesem veri duruyor; JSON yedeği alıp geri yükleyebiliyorum.

---

### AŞAMA 2: Gantt ve İlerleme Hesabı
**Amaç:** PDF'teki çizelgenin canlı hali.

- [x] Gantt bileşeni: zaman ekseni (yıl/ay/hafta başlıkları)
- [x] Çubuklar: planlanan başlangıç–bitiş
- [x] Çubuğun içinde tamamlanma dolgusu
- [x] "Bugün" dikey çizgisi
- [x] Zoom: Gün / Hafta / Ay
- [x] Tablo ile Gantt satır hizalaması ve senkron kaydırma
- [x] Domain: `schedule.ts` (gecikme, kalan gün, durum önerisi) **+ testler**
- [x] Gecikenleri kırmızı gösterme
- [x] Proje başlangıç/bitiş işaretleri (PDF'teki "işe başlama/bitim" bayrakları)

**Çıktı:** Kalemleri girince çubuklar çıkıyor, geciken işler kırmızı, genel ilerleme otomatik.

---

### AŞAMA 3: Özelleştirme ve Notlar
**Amaç:** "Benim istediğim gibi" esnek sistem.

- [ ] Tarih **+ saat** seçici (başlangıç/bitiş)
- [ ] Kalem detay paneli (yandan açılır)
- [ ] Not alanı (satırda ikon, panelde uzun metin)
- [x] **Sütun yöneticisi:** ekle, sil, yeniden adlandır, tip seç, sırala, gizle/göster
- [x] Özel sütun hücre editörleri (metin, sayı, tarih, seçim, onay, bağlantı)
- [x] Seçim tipi sütunlarda renkli etiketler
- [ ] Durum etiketleri ve renkleri, elle durum seçme (`durumElle`)
- [ ] Planlanan vs. gerçekleşen çubuk (iki katman)
- [x] Sütun silinirken veri kaybı uyarısı
- [x] Domain: `columns.ts` + testler

**Çıktı:** Yeni sütun ekleyip değer girebiliyorum, not alabiliyorum, saat girebiliyorum.

---

### AŞAMA 4: Panel ve Grafikler
**Amaç:** Bakınca her şeyi gören ekran.

- [x] Özet kartlar: genel ilerleme, kalan gün, geciken iş, bu hafta yapılacaklar, sapma
- [x] Hızlı filtreler: Tümü / Bu hafta / Gecikenler / Devam eden / Bitenler
- [ ] Arama ve çoklu filtre (durum, grup, tarih aralığı, etiket)
- [ ] Grup bazlı ilerleme çubukları
- [x] Domain: `scurve.ts` + testler
- [x] S-Eğrisi grafiği (planlanan vs. gerçekleşen)
- [x] İlerleme kayıtları (her güncellemede snapshot)
- [ ] Sürükle-bırak ile satır sıralama
- [x] Geri al / Yinele (Undo/Redo)

**Çıktı:** Tek ekranda proje sağlığı net görünüyor.

---

### AŞAMA 5: Cila, Çıktılar ve Yayın
**Amaç:** Her yerden kullanılabilen, düzgün, yedekli uygulama.

- [x] Mobil uyumlu düzen (sekmeli görünüm)
- [x] Yazdırma/PDF düzeni (künye + tablo + Gantt + imza bloğu)
- [x] Excel (.xlsx) dışa aktarım
- [x] PWA: manifest, ikon, ana ekrana ekleme, çevrimdışı çalışma
- [ ] Boş durum ekranları ("henüz kalem yok, ekle"), hata mesajları
- [ ] Performans kontrolü (200+ kalemde akıcılık)
- [ ] Erişilebilirlik kontrolü (klavye, kontrast)
- [ ] GitHub Pages / Netlify / Cloudflare Pages'e yayın
- [x] README: kullanım kılavuzu ve yedekleme önerisi

**Çıktı:** Linkten açılan, telefondan da kullanılan, yedeği alınabilen uygulama. **v1.0**

---

### AŞAMA 6: İleri Özellikler (isteğe bağlı)
- [ ] Birden fazla proje yönetimi
- [ ] Bağımlılıklar (öncül–ardıl) ve kritik yol
- [ ] Gantt'ta sürükleyerek tarih değiştirme
- [ ] Bulut senkronu (Supabase/Firebase ücretsiz)
- [ ] Hatırlatma/bildirim
- [ ] Dosya/fotoğraf ekleme
- [ ] Değişiklik geçmişi
- [ ] Salt okunur paylaşım linki

---

## 10. Kabul Kriterleri

Bir özellik, aşağıdaki maddeler sağlanınca "bitti" sayılır.

### 10.1 Genel
- [ ] `npm run build` hatasız tamamlanır
- [ ] `npm run test` geçer
- [ ] TypeScript hatası ve ESLint uyarısı yok
- [ ] Sayfa yenilenince veri korunur
- [ ] Hem masaüstünde hem telefonda kullanılabilir

### 10.2 Hesaplama
- [x] Ağırlıklar toplamı 100 ise genel ilerleme `Σ(ağırlık × tamamlanma)/100` ile birebir eşleşir (testle doğrulanmış)
- [x] Ağırlık toplamı 100 değilse uyarı farkı doğru gösterir
- [x] Bitiş tarihi geçmiş ve %100 olmayan kalem "Gecikti" görünür
- [x] Kalan gün hesabı doğru (negatifte "X gün gecikti")
- [x] S-eğrisi: tüm kalemler tamamlanınca planlanan eğri %100'e ulaşır

### 10.3 Veri güvenliği
- [x] JSON dışa aktarılan dosya tekrar içe aktarılınca birebir aynı proje oluşur
- [x] Bozuk/eksik JSON yüklenirse uygulama çökmez, anlaşılır hata verir
- [x] Silme işlemleri onay ister veya geri alınabilir

### 10.4 Özel sütunlar
- [x] Sütun ekleyince tüm mevcut satırlarda boş hücre görünür
- [x] Sütun silince uyarı çıkar, JSON'da da kaldırılır
- [x] Sütun sırası ve görünürlüğü yenilemeden sonra korunur

### 10.5 Hızlı okuma testi
- [ ] Uygulamayı ilk kez açan biri **5 saniyede** genel ilerlemeyi, geciken iş sayısını ve kalan günü bulabilir

---

## 11. Kenar Durumlar ve Riskler

| Durum / Risk | Ne yapılır |
|---|---|
| Bitiş tarihi başlangıçtan önce girilmiş | Alanı kırmızı yap, kaydetme ama uyar |
| Ağırlık negatif veya 100'den büyük | Girişte engelle/uyar |
| Tamamlanma 0–100 dışında | Sınırla (clamp) |
| Hiç kalem yok | Boş durum ekranı, "İlk kalemi ekle" |
| Çok sayıda kalem (500+) | Sanallaştırma (virtualization) düşün |
| Tarihi olmayan kalem | Gantt'ta çizilmez, tabloda "tarih yok" göster |
| Tarayıcı verisi temizlenir | Düzenli JSON yedek hatırlatması (ör. 7 günde bir) |
| Gün ışığı saati/saat dilimi kayması | Yerel zaman ISO, saat dilimi eki yok, tek biçim |
| İçe aktarılan JSON eski şema | `surum` alanına göre taşıma (migration) |
| Özel sütun tipi sonradan değişir | Mevcut değerleri dönüştürmeyi dene, olmazsa uyar |
| İki sekmede aynı anda açık | Son yazan kazanır; ileride uyarı |
| Ondalıklı ağırlıklar (ör. 0,5) | Desteklenir; toplam hesabında kayan nokta hatasına karşı yuvarla (2 hane) |
| Aynı kaleme hem plan hem gerçek tarih | İkisi ayrı alan, birbirini ezmez |

---

## 12. Yapay Zekâ ile Çalışma Kuralları

> Bu bölüm doğrudan Claude'a (veya başka bir yapay zekâ asistanına) yöneliktir.

### 12.1 Genel prensipler
1. **Önce bu belgeyi oku.** Her yeni oturumda `PROJECT.md` / `CLAUDE.md` ile başla.
2. **Bir seferde tek aşama / tek özellik.** Aşama sırasını atlama, kapsam dışına çıkma.
3. **Önce plan, sonra kod.** Büyük bir değişiklikten önce kısa bir plan sun ve onay bekle.
4. **Küçük, geri alınabilir adımlar.** Her adım sonunda uygulama çalışır durumda olmalı.
5. **Emin olmadığında sor,** varsayım yapıp ilerleme.
6. **Mevcut kodun stilini koru.** İstenmeden büyük yeniden yazım yapma.

### 12.2 Kod kuralları
- Dil: **TypeScript (strict)**. `any` kullanma; gerekiyorsa gerekçesini yaz.
- Hesaplama mantığı **sadece `src/domain/` içinde saf fonksiyon** olarak bulunur. Bileşenlerin içine formül gömme.
- Yeni domain fonksiyonu yazarken **birim testini de yaz**.
- Bileşenler küçük ve tek sorumluluklu olmalı.
- Durum değişikliği sadece store aksiyonları üzerinden yapılır; bileşen doğrudan veriyi mutasyona uğratmaz.
- ID üretimi için `crypto.randomUUID()`.
- Tarihler ISO metin olarak saklanır; biçimlendirme `utils/date.ts` içinde.
- Magic number kullanma, sabitlere çıkar.
- Yorumları **Türkçe**, değişken/fonksiyon adlarını **İngilizce veya tutarlı tek dilde** yaz (aşağıdaki not).
- Her dosyanın başında ne işe yaradığını anlatan kısa bir yorum olsun.

> **Adlandırma notu:** Bölüm 5'teki tip örnekleri Türkçe alan adları kullanıyor (okunabilirlik için). Aşama 0'da bir karar verilir: kod içinde **İngilizce** (`item`, `weight`, `plannedStart`) mi, **Türkçe** mi kullanılacağı. Seçilen kural tüm projede tutarlı uygulanır. Arayüz metinleri her halükârda Türkçedir.

### 12.3 Yapma listesi
- ❌ Ücretli servis/API ekleme
- ❌ Backend/sunucu ekleme (Aşama 6 hariç, onay ile)
- ❌ Kullanıcı verisini dışarı gönderme (analitik, izleme vb.)
- ❌ Onaysız büyük bağımlılık (paket) ekleme
- ❌ Testsiz hesaplama kodu yazma
- ❌ Kullanıcı verisini sessizce silme veya üzerine yazma
- ❌ Aşama dışı özellik ekleme ("bunu da ekledim" sürprizleri)

### 12.4 Yapma listesinin tersi: Her zaman yap
- ✔ Değişiklik sonrası `npm run build` ve `npm run test` çalıştır
- ✔ Neyi neden değiştirdiğini kısaca özetle
- ✔ Bir sonraki mantıklı adımı öner
- ✔ Veri modelini değiştirirsen `surum` ve taşıma (migration) mantığını güncelle
- ✔ Yeni özellikte kenar durumları (Bölüm 11) kontrol et
- ✔ Anlamlı commit mesajı öner (ör. `feat(gantt): bugün çizgisi eklendi`)

### 12.5 Commit düzeni
```
feat(kapsam): yeni özellik
fix(kapsam): hata düzeltme
refactor(kapsam): davranışı değiştirmeyen düzenleme
test(kapsam): test ekleme
docs: belge güncelleme
style: biçimlendirme
```

### 12.6 Aşama bitirme kontrol listesi
Bir aşama bitti demeden önce:
1. İlgili görev listesindeki tüm kutular işaretli mi?
2. Kabul kriterleri (Bölüm 10) ilgili maddeler sağlanıyor mu?
3. Build ve testler geçiyor mu?
4. Elle deneme yapıldı mı (veri gir, yenile, yedekle, geri yükle)?
5. Bu belgedeki görev kutuları ve "Açık Sorular" bölümü güncellendi mi?

---

## 13. Aşama Bazlı Hazır Komutlar (Prompt'lar)

> Claude'a kopyala-yapıştır ile verilecek başlangıç komutları. `[...]` kısımlarını kendinize göre değiştirin.

### Her oturumun başında
```
PROJECT.md dosyasını oku. Şu an [AŞAMA X]'tayız. Son durumu kısaca özetle:
neler bitti, sırada ne var. Henüz kod yazma, önce planı söyle.
```

### Aşama 0: Kurulum
```
PROJECT.md'yi oku. Aşama 0'ı yapalım.
Vite + React + TypeScript projesini bu klasörde kur, ESLint/Prettier/Vitest ekle,
Bölüm 7.2'deki klasör yapısını oluştur. types/index.ts içine Bölüm 5.2'deki tipleri yaz.
Sonra data/sampleProject.ts içinde ağırlıkları toplamı tam 100 olan örnek bir proje hazırla.
Adlandırmada İngilizce kod / Türkçe arayüz kuralını kullan.
Her adımı bitirince build'in çalıştığını doğrula.
```

### Aşama 1: Tablo
```
Aşama 1'e başlıyoruz. Önce kısa bir plan çıkar.
Sonra sırayla: (1) domain/progress.ts fonksiyonlarını testleriyle yaz,
(2) Zustand store, (3) otomatik kayıt, (4) ağaç tablo ve satır içi düzenleme,
(5) JSON dışa/içe aktarma. Her adım sonrası uygulamanın çalıştığını göster.
```

### Aşama 2: Gantt
```
Aşama 2: Gantt çizelgesini yapalım. Tablo ile satır hizalı olsun, senkron kaydırsın.
Bugün çizgisi, gün/hafta/ay zoom, tamamlanma dolgusu ve geciken işler kırmızı olsun.
Önce domain/schedule.ts içindeki gecikme ve kalan gün fonksiyonlarını testleriyle yaz.
```

### Aşama 3: Özel sütunlar
```
Aşama 3: Sütun yöneticisini yapalım. Sütun tanımı ile değer ayrı saklanıyor (Bölüm 5.3).
Tipler: metin, sayı, tarih, seçim, onay, bağlantı. Ekle/sil/sırala/gizle olsun.
Sütun silerken veri kaybı uyarısı çıksın. Mevcut JSON yedekleri bozulmasın,
gerekirse migration yaz.
```

### Aşama 4: Panel
```
Aşama 4: Özet kartlar, hızlı filtreler, S-eğrisi ve undo/redo.
Önce domain/scurve.ts'i (Bölüm 3.2 formülleri) testleriyle yaz.
Sonra grafiği ve kartları ekle. Sapma değerini (+/−) göster.
```

### Aşama 5: Yayın
```
Aşama 5: Mobil düzen, yazdırma/PDF düzeni (imza bloğu dahil), Excel çıktısı,
PWA ve GitHub Pages yayını. Yayın adımlarını sırayla, benim yapacaklarımı da
açıkça belirterek anlat.
```

### Hata ayıklama
```
[Ne yaptım], [ne bekledim], [ne oldu]. Konsol hatası: [...].
Önce sebebi tahmin et ve nasıl doğrulayacağımızı söyle, sonra düzelt.
Düzeltmeden sonra bu hatayı yakalayacak bir test ekle.
```

### Oturum sonunda
```
Bugün yaptıklarımızı özetle, PROJECT.md'deki görev kutularını güncelle,
bir sonraki oturum için "nereden devam edelim" notunu yaz.
```

---

## 14. Açık Sorular ve Kararlar

Aşama 0'da cevaplanacak ve buraya işlenecek.

| # | Soru | Varsayılan | Karar |
|---|---|---|---|
| 1 | Teknoloji: React+TS mi, Vanilla JS mi? | React + TypeScript | ✔ React 19 + TypeScript 6.0 (strict), Vite 8. TS 7'ye typescript-eslint desteği gelince geçilir |
| 2 | Kod içi adlandırma: İngilizce mi Türkçe mi? | İngilizce kod, Türkçe arayüz | ✔ İngilizce kod (`Item`, `weight`, `planned.start`), Türkçe arayüz ve yorumlar |
| 3 | Veri saklama: localStorage mı IndexedDB mi? | IndexedDB | ✔ IndexedDB (`idb-keyval`); okunamayan kayıt silinmez, ayrı anahtara yedeklenir |
| 4 | Stil: Tailwind mi düz CSS mi? | Tailwind | ✔ Düz CSS + CSS değişkenleri (`tokens.css`, `app.css`); ek bağımlılık yok |
| 5 | Yeni projenin türü ve gerçek iş kalemleri nedir? | (kullanıcı verecek) | ☐ |
| 6 | Sadece kullanıcı mı kullanacak, paylaşım gerekecek mi? | Sadece kullanıcı | ☐ |
| 7 | Gantt granülaritesi: Gün bazlı mı, PDF'teki gibi hafta bazlı mı? | Gün/Hafta/Ay geçişli | ✔ Gün/Hafta/Ay geçişli (ayar projeyle saklanır). Tarih hesapları date-fns olmadan, takvim günü üzerinden (`utils/date.ts`) |
| 8 | Ağırlık modeli: mutlak (PDF gibi) mi, grup içi göreli mi? | Mutlak | ☐ |
| 9 | Çalışma günü/hafta sonu ve resmî tatil dikkate alınacak mı? | Hayır (takvim günü) | ☐ |
| 10 | Yayın platformu: GitHub Pages / Netlify / Cloudflare? | GitHub Pages | ✔ GitHub Pages, GitHub Actions ile (lint+test+build geçerse yayın). `base: './'` sayesinde Netlify/Cloudflare'de de aynı derleme çalışır |
| 11 | Para birimi/bütçe alanları gerekecek mi? | Özel sütunla çözülür | ☐ |
| 12 | Bildirim/hatırlatma gerekli mi? | Aşama 6 | ☐ |

---

## 15. Sözlük

| Terim | Anlamı |
|---|---|
| **İş programı** | Bir işin hangi kalemlerinin hangi tarihlerde yapılacağını gösteren zaman çizelgesi |
| **Pursantaj (oranı)** | Bir iş kaleminin toplam işteki ağırlığı (yüzde) |
| **İş kısmı** | Ana iş grubu (Kaba inşaat, Elektrik vb.) |
| **İmalat kalemi** | Gruptaki alt iş (Temel, Duvar vb.) |
| **Gantt** | İşleri zaman ekseninde yatay çubuklarla gösteren çizelge |
| **S-Eğrisi** | Zamana göre kümülatif ilerlemeyi gösteren S biçimli grafik |
| **Sapma** | Gerçekleşen ile planlanan ilerleme arasındaki fark |
| **Kritik yol** | Gecikirse tüm projeyi geciktiren iş zinciri |
| **Snapshot / İlerleme kaydı** | Belirli bir andaki genel ilerlemenin kaydı |
| **Migration** | Eski veri biçimini yeni biçime dönüştürme |
| **PWA** | Ana ekrana eklenebilen, çevrimdışı çalışabilen web uygulaması |
| **Saf fonksiyon** | Aynı girdiye hep aynı çıktıyı veren, dış durumu değiştirmeyen fonksiyon |
| **Künye** | Projenin üst bilgi alanları (idare, yüklenici, tarihler vb.) |

---

## Sürüm Geçmişi

| Tarih | Değişiklik |
|---|---|
| 29.10.2026 | İlk sürüm: kapsam, veri modeli, yol haritası, yapay zekâ kuralları |
| 30.10.2026 | Aşama 0: iskelet, araçlar, tipler ve örnek veri hazır; karar 1 ve 2 işlendi |
| 30.10.2026 | Aşama 1: store, IndexedDB otomatik kayıt, ağaç tablo + satır içi düzenleme, künye, tema, JSON yedek; karar 3 ve 4 işlendi |
| 30.10.2026 | Aşama 2: schedule/timeline/rows domain + testler, Gantt (hizalı/senkron kaydırma, bugün çizgisi, zoom, dolgu, gecikme kırmızı, başlama/bitim işaretleri); kapanışta kayıt kaybı düzeltildi (localStorage acil kayıt); karar 7 işlendi |
| 30.10.2026 | Aşama 3 (kısmi): sütun yöneticisi (ekle/sil/yeniden adlandır/tip değiştir/sırala/gizle), 6 hücre tipi, seçim seçenekleri, güvenli bağlantı, veri kaybı uyarıları; şema değişmedi (migration gerekmedi, eski yedek testi eklendi) |
| 30.10.2026 | Aşama 4 (kısmi): scurve/filters domain + testler, özet kartlar (sapma ±), hızlı filtreler, S-eğrisi (SVG, Recharts yerine), günlük ilerleme kaydı, geri al/yinele + kısayollar |
| 30.10.2026 | Aşama 5 (kısmi): mobil sekmeli düzen + menü, yazdırma/PDF (künye, sığdırılmış Gantt, imza bloğu), Excel (SheetJS 0.20.3, CDN'den, dinamik yükleme), PWA (manifest, ikonlar, elle service worker), GitHub Pages iş akışı, README |

---

*Bu belge yaşayan bir belgedir: her aşama sonunda görev kutuları, kararlar ve sürüm geçmişi güncellenir.*
