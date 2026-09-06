# Error boundary

`modules/error-boundary`, React render hatalarını ve browser runtime hatalarını ortak reporter pipeline'ında yakalar. Fallback görünümü, uygulama içi hata olayı ve gözlemlenebilirlik handler'ları birbirinden izole çalışır.

## Sınır

Modül client tarafında capture, normalize, dedupe, handler fan-out ve recovery UI yönetir. Server exception middleware'i, API error sözleşmesi ve ürün hata metni bu modülün dışında kalır.

| Dosya         | Sorumluluk                                                                           |
| ------------- | ------------------------------------------------------------------------------------ |
| `boundary.js` | React boundary çekirdeği ve `GlobalError`/`ModuleError`/`ComponentError` preset'leri |
| `listener.js` | `error` ve `unhandledrejection` browser listener'ı                                   |
| `reporter.js` | Report normalizasyonu, sampling, fingerprint, dedupe ve handler'lar                  |
| `index.js`    | Public facade                                                                        |

## Kurulum

Root'ta bir global listener ve boundary kullanın. Dar surface'leri gerektiğinde `ModuleError` ile izole edin:

```jsx
<GlobalErrorListener />
<GlobalError>
  <AppProviders>{children}</AppProviders>
</GlobalError>
```

`GlobalErrorListener`ı route veya feature layout'larında tekrar mount etmeyin.

## API seçimi

| İhtiyaç                  | API                                           |
| ------------------------ | --------------------------------------------- |
| Uygulama ağacı           | `GlobalError`                                 |
| Bağımsız surface         | `ModuleError`                                 |
| Küçük UI alanı           | `ComponentError`                              |
| Özel boundary sözleşmesi | `ErrorBoundaryCore`                           |
| Browser global hataları  | `GlobalErrorListener`                         |
| Report göndermek         | `getErrorReporter`                            |
| Hedef eklemek            | `createConsoleHandler`, `createSentryHandler` |

## Kullanım

Surface fallback'i `resetError` ile tekrar deneme sunabilir:

```jsx
<ModuleError
  name="Comments"
  fallback={({ error, resetError }) => (
    <RetryPanel error={error} onRetry={resetError} />
  )}
>
  <CommentsPanel />
</ModuleError>
```

Reporter shared singleton'dır. Ayarları uygulama bootstrap'ında yapın:

```js
const reporter = getErrorReporter({ sampleRate: 1, deduplicateWindow: 60000 });

reporter.addHandler(createConsoleHandler({ level: "warn" }));
reporter.captureError(error, {
  route: "/projects/123",
  source: "project-panel",
});
```

İlk `getErrorReporter` çağrısı seçenekleri belirler. Sonraki çağrılar aynı instance'ı döndürür.

## Lifecycle ve kurallar

- Boundary hatayı capture eder, reporter'a iletir ve `APP_ERROR` olayını yayınlar
- Global listener `error` ile `unhandledrejection` olaylarını normalize eder
- Sampling veya dedupe tarafından elenen report handler'a gitmez
- Bir handler'ın hatası diğer handler'ları veya fallback'i bozmaz
- `resetKey` değişirse `ErrorBoundaryCore` hata state'ini temizler

Context, tag veya extra context içine secret ve gereksiz kişisel veri koymayın. Handler içinde yeniden `captureError` çağırmayın; reporting döngüsü oluşur.

## Doğrulama

```bash
npx prettier --check modules/error-boundary/*.js modules/docs/error-boundary.md
npx eslint modules/error-boundary/*.js
node --import ./scripts/register-alias.mjs --test tests/modules.test.js
```
