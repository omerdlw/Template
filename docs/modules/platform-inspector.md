# Platform Inspector

`modules/platform-inspector`, platform modüllerinin canlı durumunu geliştirme ortamında tek bir
salt-okunur panelde toplar. Amaç, Registry kayıtlarını, Nav koreografisini ve global surface
durumlarını davranışı değiştirmeden birlikte görebilmektir.

## Sınır

- Yalnızca public module hook'larını tüketir; hiçbir internal dosyaya erişmez.
- Komut, temizleme veya state mutation API'si sunmaz.
- Descriptor içeriğini göstermez; yalnızca sayılar, lifecycle bilgisi, scheduler görev metadatası ve
  sınırlı tanı olayları gösterir.
- Production build'de `null` render eder.

## Kurulum

Inspector bütün platform provider'larının altında, root composition içinde bir kez mount edilir:

```jsx
<NavigationProvider>
  {children}
  <PlatformInspector />
</NavigationProvider>
```

Panel sol altta kapalı bir `details` olarak durur. Registry entry sayıları, Background, Loading,
Modal, Notification ve Nav runtime sağlığı aynı snapshot içinde görüntülenir.

Bu modül ve root entrypoint'i experimentaldir. Ürün feature'ları inspector'a bağımlı olmamalı;
yalnızca geliştirme ve tanılama amaçlı root composition tarafından kullanılmalıdır.

## Doğrulama

```bash
npm run modules:check
npx eslint src/modules/platform-inspector/index.js
npx prettier --check src/modules/platform-inspector/index.js docs/modules/platform-inspector.md
```
