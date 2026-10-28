# Halkbank Kripto – Tıklanabilir Prototip (PWA)

Figma tasarımından (halkkripto) yapılmış, iPhone'da uygulama gibi çalışan interaktif demo.

## Akış
Açılış → Ana Sayfa → **Kripto İşlemleri**
- Kripto’ya Para Gönder → Tutar (klavye) → Devam → İşlem Özeti → Onayla → İşlem Sonuç → Dekont
- Kripto Varlıklarım
- Kripto Piyasaları (Tümünü Gör / büyüteç) – arama ve TL / USD / Tümü filtresi çalışır

Transfer yapılınca Vadesiz hesap bakiyesi düşer, Halk Kripto nakit bakiyesi artar ve Ana Sayfa'daki hesap hareketlerine yeni kayıt eklenir. Sayfa yenilenince demo başa döner.

Ekranın sol kenarından sağa kaydırarak geri gidilebilir (iOS hareketi). Göz ikonu bakiyeleri gizler. Demoda olmayan butonlar "Bu özellik demoda yer almıyor" uyarısı verir.

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
