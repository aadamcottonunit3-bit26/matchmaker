const sharp = require('/home/claude/site/marriage-bureau/node_modules/sharp');
const fs = require('fs');
const out = (n, b) => fs.writeFileSync('/tmp/e2e/img/' + n, b);
(async () => {
  const mk = (w, h, c) => sharp({ create: { width: w, height: h, channels: 3, background: c } });
  out('front.png', await mk(900, 600, { r: 20, g: 120, b: 80 }).png().toBuffer());
  out('back.jpg', await mk(900, 600, { r: 120, g: 20, b: 80 }).jpeg().toBuffer());
  out('selfie_gps.jpg', await mk(900, 700, { r: 80, g: 80, b: 200 }).withExif({ IFD0: { Copyright: 'x' }, GPS: { GPSLatitudeRef: 'N', GPSLatitude: '29/1 22/1 0/1' } }).jpeg().toBuffer());
  out('photo.webp', await mk(900, 900, { r: 200, g: 160, b: 40 }).webp().toBuffer());
  out('b_photo.jpg', await mk(800, 800, { r: 200, g: 40, b: 160 }).jpeg({ quality: 92 }).toBuffer());
  fs.writeFileSync('/tmp/e2e/img/fake.jpg', '<html><script>alert(1)</script></html>');
})();
