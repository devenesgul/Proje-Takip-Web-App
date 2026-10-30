# Proje Takip

İş programını (Gantt + pursantaj tablosu) tek ekranda gösteren, ilerlemeyi **ağırlıklı yüzde** ile
otomatik hesaplayan, ücretsiz ve kişisel kullanım için bir web uygulaması. Sunucu yoktur;
veriler yalnızca kullandığınız tarayıcıda durur. Ayrıntılı tasarım belgesi: [PROJECT.md](PROJECT.md).

**Canlı adres (yayınlandıktan sonra):** https://devenesgul.github.io/Proje-Takip-Web-App/

## Kullanım

| Ne                      | Nasıl                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| Hücre düzenleme         | Hücreye tıklayın → yazın → **Enter** (vazgeçmek için **Esc**)                    |
| Kalem / iş kısmı ekleme | Grup satırındaki **＋**, üst bardaki **+ İş kısmı**                              |
| Silme / kopyalama       | Satır sonundaki 🗑 / ⧉ (silme onay ister, **Ctrl/⌘+Z** ile geri alınır)           |
| Özel sütunlar           | **Sütunlar**: metin, sayı, tarih, seçim, onay, bağlantı                          |
| Proje bilgileri         | **Künye**                                                                        |
| Filtre                  | Özet kartlara veya tablonun üstündeki çiplere tıklayın                           |
| Gantt ölçeği            | **Gün / Hafta / Ay**, **Bugüne git**                                             |
| Geri al / yinele        | ↶ ↷ veya **Ctrl/⌘+Z**, **Ctrl/⌘+Shift+Z**                                        |
| Yedek, Excel, PDF       | **Dosya ▾** menüsü (PDF için "Yazdır / PDF" → yazıcı olarak "PDF olarak kaydet") |
| Telefonda               | Panel / Tablo / Gantt sekmeleri; işlemler **☰ Menü** altında                    |

### Ana ekrana ekleme (uygulama gibi kullanma)

- **Android / Chrome:** adres çubuğundaki menü → _Uygulamayı yükle_ (veya _Ana ekrana ekle_).
- **iPhone / Safari:** Paylaş → _Ana Ekrana Ekle_.
- **Masaüstü Chrome / Edge:** adres çubuğunun sağındaki _yükle_ simgesi.

Bir kez açıldıktan sonra internet olmadan da açılır.

## ⚠️ Yedekleme (önemli)

Veriler **yalnızca o tarayıcıda** (IndexedDB) saklanır. Tarayıcı verisini temizlemek, başka bir
tarayıcı/cihaz kullanmak veya gizli pencere açmak verinin görünmemesine yol açar.

- Düzenli olarak **Dosya ▾ → JSON yedek al** yapın (ör. haftada bir) ve dosyayı bulut klasörünüzde saklayın.
- Başka bir cihaza taşımak için: eski cihazda _JSON yedek al_ → yeni cihazda _JSON yedekten yükle_.
- Bilgisayarınızdaki `localhost` adresinde girdiğiniz veriler yayın adresinde **görünmez** (farklı site
  sayılır); aynı yöntemle taşıyın.

## Geliştirme

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # birim testleri (Vitest)
npm run lint       # ESLint
npm run build      # dist/ klasörüne yayın derlemesi
npm run preview    # derlemeyi yerelde deneme (PWA/çevrimdışı burada çalışır)
```

## Yayın (GitHub Pages)

`main` dalına her push'ta [.github/workflows/deploy.yml](.github/workflows/deploy.yml) çalışır:
lint → test → build; hepsi geçerse `dist/` GitHub Pages'e yüklenir. Testlerden biri kırılırsa yayın yapılmaz.

İlk kurulumda bir kez:

1. Depo **herkese açık (Public)** olmalı (ücretsiz hesapta Pages yalnızca açık depolarda çalışır).
   GitHub → depo → _Settings → General → Danger Zone → Change visibility_.
   Depoda kişisel veri yoktur (veriler tarayıcıda durur); yalnızca kod ve örnek proje görünür.
2. GitHub → depo → _Settings → Pages → Build and deployment → Source:_ **GitHub Actions**.
3. Değişiklikleri `main` dalına gönderin (`git push`).
4. _Actions_ sekmesinde "Yayın (GitHub Pages)" iş akışının yeşil olmasını bekleyin (1–2 dk).
5. Adres: `https://devenesgul.github.io/Proje-Takip-Web-App/`

Güncelleme: kodu değiştirip `main`'e push etmeniz yeterli. Açık sekmeler yeni sürümü bir sonraki
yenilemede alır.
