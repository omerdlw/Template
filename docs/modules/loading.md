# Loading

`modules/loading`, sayfa düzeyindeki loading durumunu tek provider'da toplar. Registry kaydı ve manuel action aynı state'i günceller; `LoadingOverlay` yalnız bu state'in görünümüdür.

## Sınır

Modül `minDuration`, skeleton, overlay görünürlüğü ve timer cleanup'ını yönetir. Route segment `loading.js` dosyalarını, istekleri veya feature'a ait progress arayüzünü yönetmez.

`provider.js` state modeli, option normalizasyonu, context'ler ve timer lifecycle'ını; `index.js` public facade ile overlay'i içerir. Ayrı bir config veya motion dosyası yoktur.

## Kurulum

`LoadingProvider`ı Registry'nin altında, `LoadingOverlay`i provider içinde bir kez render edin:

```jsx
<RegistryProvider>
  <LoadingProvider>
    {children}
    <LoadingOverlay />
  </LoadingProvider>
</RegistryProvider>
```

## API seçimi

| İhtiyaç                       | API                                             |
| ----------------------------- | ----------------------------------------------- |
| Global görünümü kurmak        | `LoadingProvider`, `LoadingOverlay`             |
| Loading durumunu okumak       | `useLoadingState`                               |
| Bir işi manuel sarmalamak     | `useLoadingActions`                             |
| Sayfa descriptor'ı yayınlamak | `useLoadingRegistration` veya `usePageRegistry` |

`useLoadingState()` `isLoading`, `isPageLoading`, `skeleton`, `minDuration` ve `showOverlay` döndürür. `useLoadingActions()` `startLoading`, `stopLoading`, `setLoading`, `setIsLoading` ve `setSkeleton` döndürür.

## Kullanım

Manuel işlerde `stopLoading`i `finally` içinde çağırın:

```jsx
function SaveButton() {
  const { startLoading, stopLoading } = useLoadingActions();

  async function save() {
    startLoading({ minDuration: 250, showOverlay: false });
    try {
      await saveChanges();
    } finally {
      stopLoading();
    }
  }

  return <Button onClick={save}>Save</Button>;
}
```

Sayfa verisine bağlı loading için kaydı component lifecycle'ına bağlayın:

```jsx
function MediaLoading({ isFetching }) {
  useLoadingRegistration(
    { isLoading: isFetching, minDuration: 300 },
    { source: "media-page" },
  );
  return null;
}
```

`showOverlay: false` loading state'i korur fakat global Spinner'ı gizler. Feature bu durumda kendi erişilebilir progress göstergesini sunmalıdır.

## Lifecycle ve kurallar

- Yeni başlangıç bekleyen stop timer'ını iptal eder
- `minDuration` geçmeden gelen stop isteği timer tamamlanınca state'i sıfırlar
- Geçersiz veya negatif `minDuration`, `0` olur
- Fullscreen state aktifken overlay gizlenir; loading state kaybolmaz
- Provider unmount olduğunda timer temizlenir

Provider'ı ve overlay'i tekrar mount etmeyin. Aynı işi hem Registry hem manuel action ile source politikası olmadan başlatmayın.

## Doğrulama

```bash
npm test
npx eslint src/modules/loading
npx prettier --check src/modules/loading docs/modules/loading.md
```
