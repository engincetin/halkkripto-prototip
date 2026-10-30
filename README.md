# Halkbank Kripto – Tıklanabilir Prototip (PWA)

Figma tasarımından (halkkripto) yapılmış, iPhone'da uygulama gibi çalışan interaktif demo.

## Akış
Açılış → Ana Sayfa → **Kripto İşlemleri**
- Kripto’ya Para Gönder → Tutar (klavye) → Devam → İşlem Özeti → Onayla → İşlem Sonuç → Dekont
  - Gönderen hesaptaki turuncu oka dokununca alttan açılan menüden Vadesiz TL / Vadesiz USD hesabı seçilir; USD hesabından dolar gönderilebilir
- Kripto Varlıklarım (her kriptonun altında Al / Sat: Halk Kripto'yu o kripto ve yönle doğrudan Al/Sat ekranında açar)
- Kripto Piyasaları (Tümünü Gör / büyüteç) – 28 kripto; arama ve TL / USD / Tümü filtresi çalışır (Kripto İşlemleri ekranında ilk 6 gösterilir)
- Halk Kripto kartındaki TL düğmesi: alttan açılan menüden TL / USD seçimi; bakiye, kar/zarar, piyasa ve varlık tutarları seçilen para biriminde
- Herhangi bir kriptoya dokununca detay ekranı: fiyat, grafik (1S–1Y, parmakla fiyat okuma), fiyat aralığı, piyasa bilgileri, Durumum sekmesi, Al/Sat

Transfer yapılınca Vadesiz hesap bakiyesi düşer, Halk Kripto nakit bakiyesi artar ve Ana Sayfa'daki hesap hareketlerine yeni kayıt eklenir. Sayfa yenilenince demo başa döner.

Ekranın sol kenarından sağa kaydırarak geri gidilebilir (iOS hareketi). Göz ikonu bakiyeleri gizler. Demoda olmayan butonlar "Bu özellik demoda yer almıyor" uyarısı verir. Ana sayfada Kripto İşlemleri kutucuğu, ilk girişe kadar nabız gibi atan bir çerçeve ve "Buradan başlayın" balonuyla vurgulanır.

## İki uygulama: Halkbank ve Halk Kripto
- **Halkbank** (bu klasör): bankacılık uygulaması. Kripto Al/Sat, Kripto Varlıklarım ve kripto detaydaki Al/Sat butonları "Halk Kripto'ya yönlendiriliyorsunuz" pop-up'ını açar; Devam ile Halk Kripto, iOS uygulama açma animasyonuyla açılır, "Halkbank'a Dön" ile geri gelinir.
- **Halk Kripto** (`kripto/`): Al/Sat uygulaması. Kendi adresi (`.../kripto/`), adı, ikonu ve açılış ekranı vardır; tek başına da ana ekrana eklenebilir. Halkbank ile aynı kurumsal kimliği (`styles.css`) ve aynı veriyi (`common.js`) kullanır. Ana sayfa: Toplam Varlığım (TL/USD), hızlı işlemler, kapatılabilir kampanya kartı, Yükselenler / Düşenler / Favorilerim. Halkbank'tan açıldığında oradaki güncel bakiyeyi gösterir ve sol üstte "‹ Halkbank" ile geri dönülür. Piyasalar: ★ / TL / USD sekmeleri, isim-fiyat-değişim sıralaması, Listeyi Düzenle (Son / En İyi Alış / En İyi Satış / Ortalama fiyat) ve arama ekranı (geçmiş aramalar, popüler). Varlıklarım: toplam varlık, kar/zarar ve dağılım çubuğu, hızlı işlemler, varlıklarda arama, "Sıfır bakiyeli varlıkları gizle", açılır-kapanır Nakit / Kripto Varlıklarım. İşlemler (alt menü sekmesi): bu ayın özeti (alış, satış, yatırılan, çekilen), İşlem ve İşlem Durumu seçimleri, Detaylı Arama (tarih, varlık), Halkbank hesap hareketleri düzeninde aylara göre liste ve işlem detayı (Daha Fazla Göster, Gerçekleşme / İptal Bilgisi); Halkbank’tan gönderilen para burada "Yatırma" olarak görünür. Profil (ana sayfadaki fotoğraftan açılır): Profil ve Ayarlar (para birimi, dil, iletişim tercihleri, tema, Face ID, limitler, iletişim, hesap kapatma, çıkış), Kişisel Bilgiler, İşlem Limitleri (günlük/aylık), İletişim Tercihleri.
- **Kripto Al/Sat** (Halkbank döviz alış/satış akışının aynısı): Alış/Satış sekmesi, kripto tipi seçimi (arama), alış/satış fiyatı ve yenileme, paranın çekileceği / aktarılacağı hesap (Halk Kripto TL veya USD), kripto veya para cinsinden tutar (%25/%50/%75/Tümü), komisyon ve bakiye kontrolü → İşlem Özeti (işlem onay anındaki fiyattan gerçekleşir; işlem fiyatı sonuçta gösterilir) → Onayla → İşlem Sonuç (Dekont, Varlıklarıma Git, Yeni İşlem). Alt menüdeki Al/Sat, hızlı işlemler, piyasa ve arama satırları, Varlıklarım'daki Al/Sat düğmeleri ve Halkbank'taki Al/Sat (çift ve yön ile) bu ekranı açar. Alım/satım bakiyeleri, varlıkları, İşlem Geçmişi'ni ve limitleri günceller; Halkbank'a dönünce orada da görünür.
- **Yatır**: Para Yatır (TL / USD) ve Kripto Yatır (28 kripto, arama). Kriptoda ağ seçimi (ör. USDT: ERC-20 / TRC-20 / Avalanche) → bilgilendirme → adres bilgileri (kopyalanabilir demo adres, XRP için hedef etiket, QR, minimum tutar, tahmini süre). TL/USD'de IBAN, alıcı adı, açıklama (müşteri no) ve limitler; "Halkbank’tan Para Gönder" Halkbank'ta Kripto’ya Para Gönder ekranını ilgili hesap seçili açar. Adresler ve QR gerçek değildir.
- iOS'ta ana ekrandaki iki web uygulaması birbirini açamadığı için Halkbank içinden açılan Halk Kripto, aynı uygulamanın çerçeve (iframe) içinde gösterilir; kod tek, iki yerde de aynı çalışır.

## iPhone'da açmak
1. Bu klasörü bir HTTPS adresine yükleyin. En kolayı: https://app.netlify.com/drop sayfasına klasörü sürükleyip bırakın.
2. iPhone'da **Safari** ile linki açın.
3. **Paylaş → Ana Ekrana Ekle** deyin.
4. Ana ekrandaki ikondan açın: tam ekran, adres çubuğu olmadan, açılış ekranıyla başlar. İnternet olmadan da açılır.

Bilgisayarda açınca otomatik olarak iPhone çerçevesi içinde gösterilir (sunum için).

## Kendi bilgisayarında denemek
```
python3 -m http.server 8000
```
sonra http://localhost:8000

## Notlar
- Font: Tasarımdaki "Falling Sky" yerine ona yakın **Nunito Sans** kullanıldı. Falling Sky lisansınız varsa `fonts/` klasörüne koyup `styles.css` içindeki `@font-face` tanımını değiştirmeniz yeterli.
- Açılış görseli (`img/acilis.jpg`) Figma'dan 1x çözünürlükte alındı. Daha keskin olması için Figma'dan 3x PNG/JPG export edip aynı isimle değiştirin.
- Dosyaları güncelledikten sonra `sw.js` içindeki `VERSION` değerini artırın.
