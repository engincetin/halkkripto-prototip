# Halkbank Kripto – Tıklanabilir Prototip (PWA)

Figma tasarımından (halkkripto) yapılmış, iPhone'da uygulama gibi çalışan interaktif demo.

## Akış
Açılış → Ana Sayfa → **Kripto İşlemleri**
- Kripto’ya Para Gönder → Tutar (klavye) → Devam → İşlem Özeti → Onayla → İşlem Sonuç → Dekont
  - Gönderen hesaptaki turuncu oka dokununca alttan açılan menüden Vadesiz TL / Vadesiz USD hesabı seçilir; USD hesabından dolar gönderilebilir
- Kripto Varlıklarım
- Kripto Piyasaları (Tümünü Gör / büyüteç) – arama ve TL / USD / Tümü filtresi çalışır
- Halk Kripto kartındaki TL düğmesi: alttan açılan menüden TL / USD seçimi; bakiye, kar/zarar, piyasa ve varlık tutarları seçilen para biriminde
- Herhangi bir kriptoya dokununca detay ekranı: fiyat, grafik (1S–1Y, parmakla fiyat okuma), fiyat aralığı, piyasa bilgileri, Durumum sekmesi, Al/Sat

Transfer yapılınca Vadesiz hesap bakiyesi düşer, Halk Kripto nakit bakiyesi artar ve Ana Sayfa'daki hesap hareketlerine yeni kayıt eklenir. Sayfa yenilenince demo başa döner.

Ekranın sol kenarından sağa kaydırarak geri gidilebilir (iOS hareketi). Göz ikonu bakiyeleri gizler. Demoda olmayan butonlar "Bu özellik demoda yer almıyor" uyarısı verir. Ana sayfada Kripto İşlemleri kutucuğu, ilk girişe kadar nabız gibi atan bir çerçeve ve "Buradan başlayın" balonuyla vurgulanır.

## İki uygulama: Halkbank ve Halk Kripto
- **Halkbank** (bu klasör): bankacılık uygulaması. Kripto Al/Sat ve kripto detaydaki Al/Sat butonları "Halk Kripto'ya yönlendiriliyorsunuz" pop-up'ını açar; Devam ile Halk Kripto, iOS uygulama açma animasyonuyla açılır, "Halkbank'a Dön" ile geri gelinir.
- **Halk Kripto** (`kripto/`): Al/Sat uygulaması. Kendi adresi (`.../kripto/`), adı, ikonu ve açılış ekranı vardır; tek başına da ana ekrana eklenebilir. Halkbank ile aynı kurumsal kimliği (`styles.css`) ve aynı veriyi (`common.js`) kullanır. Ana sayfa: Toplam Varlığım (TL/USD), hızlı işlemler, kapatılabilir kampanya kartı, Yükselenler / Düşenler / Favorilerim. Halkbank'tan açıldığında oradaki güncel bakiyeyi gösterir ve sol üstte "‹ Halkbank" ile geri dönülür.
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
