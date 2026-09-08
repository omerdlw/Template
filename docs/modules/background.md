# Background

`modules/background`, aktif sayfanın image veya video background'ını Registry ve manuel action'larla gösterir. Provider kaynak ve playback state'ini tutar, overlay ise yalnız görünümü render eder.

## Sınır

Background kaydını seçmek, URL üretmek ve feature state'i domain'e aittir. Modül image/video görünümü, overlay, gradient, noise, video playback ve cleanup'ı yönetir.

`constants.js` varsayılan değerleri ve class haritalarını, `utils.js` state normalizasyonu ve saf görsel hesapları, `motion.js` animasyon kurallarını, `provider.js` context ve video element lifecycle'ını, `index.js` facade ile `BackgroundOverlay`i içerir.

## Kurulum

```jsx
<RegistryProvider>
  <BackgroundProvider>
    {children}
    <BackgroundOverlay />
  </BackgroundProvider>
</RegistryProvider>
```

## API seçimi

| İhtiyaç                               | API                                                |
| ------------------------------------- | -------------------------------------------------- |
| Global background görünümü            | `BackgroundProvider`, `BackgroundOverlay`          |
| State okumak                          | `useBackgroundState`                               |
| Background veya playback değiştirmek  | `useBackgroundActions`                             |
| Provider yokken güvenli action okumak | `useOptionalBackgroundActions`                     |
| Sayfa tanımı yayınlamak               | `useBackgroundRegistration` veya `usePageRegistry` |

Actions: `setBackground`, `resetBackground`, `toggleVideo`, `toggleMute`, `toggleLoop`, `setVideoPlaying` ve `setVideoElement`.

## Kullanım

Sayfa yaşam döngüsünde declarative bir kayıt yayınlayın:

```jsx
function MediaBackground({ media }) {
  useBackgroundRegistration(
    {
      image: media.backdropUrl,
      position: "center",
      overlay: true,
      overlayOpacity: 0.24,
      fadeEdges: { left: 18, right: 18 },
    },
    { source: "media-page" },
  );
  return null;
}
```

Video için `videoOptions` altında playback tercihlerini verin:

```jsx
function TrailerBackground({ src }) {
  const { setBackground } = useBackgroundActions();

  useEffect(() => {
    setBackground({
      video: src,
      videoOptions: {
        autoplay: true,
        muted: true,
        loop: true,
        playbackRate: 1,
      },
    });
  }, [setBackground, src]);

  return null;
}
```

`width`, `fit`, `videoStyle`, `videoClassName` ve `className` görünümü ayarlar. Bu alanları hem top level hem `videoOptions` içinde çelişkili vermeyin.

## Lifecycle ve kurallar

- Kaynak değişirse önceki playback state'i taşınmaz
- Aynı kaynak güncellenirse mevcut playback state korunur
- `play()` rejection'ı render'ı bozmaz
- Video element unmount olduğunda runtime bağlantısı temizlenir
- Overlay ve noise katmanları pointer event almaz

Aynı sayfada birden fazla `BackgroundOverlay` mount etmeyin. Video DOM element'ini doğrudan mutate etmek yerine action facade'ını kullanın.

## Doğrulama

```bash
npm test
npx eslint src/modules/background
npx prettier --check src/modules/background docs/modules/background.md
```
