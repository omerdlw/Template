# Registry

`src/modules/registry`, feature'ların geçici UI descriptor'larını yayınladığı external store'dur. Nav, Background, Controls, Loading, Modal ve Context Menu bu descriptor'ları kendi davranışına göre tüketir.

## Sınır

Registry type/key/source metadata'sını, validation'ı, priority çözümünü ve registration cleanup'ını yönetir. Payload'ın domain anlamını veya tüketen modülün görünümünü yönetmez.

| Dosya           | Sorumluluk                                                      |
| --------------- | --------------------------------------------------------------- |
| `index.js`      | Tek public facade                                               |
| `schema.js`     | Type, key, source, lifecycle ve validation kuralları            |
| `operations.js` | Register, unregister, batch ve effective value çözümü           |
| `provider.js`   | External store, provider, action ve selector hook'ları          |
| `adapters.js`   | Feature registration hook'ları, bootstrap ve route adapter'ları |
| `hooks.js`      | Type-scoped okuma/kayıt hook'ları ve config stabilization       |
| `handlers.js`   | Descriptor uygulama, batch ve source/instance cleanup lifecycle |
| `runtime.js`    | Scope, transaction, diagnostics ve inspector runtime'ı          |

## Kurulum

Registry'yi onu tüketen provider'ların üstünde bir kez kurun. Değişmeyen başlangıç kayıtlarını `initialEntries` ile verin:

```jsx
<RegistryProvider initialEntries={appEntries}>
  <BackgroundProvider>
    <LoadingProvider>
      <ModalProvider>{children}</ModalProvider>
    </LoadingProvider>
  </BackgroundProvider>
</RegistryProvider>
```

## API seçimi

| İhtiyaç                          | API                                                                                                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bir sayfanın birden çok tanımı   | `usePageRegistry`                                                                                                                                                                     |
| Tek feature tanımı               | `useNavRegistration`, `useNavHudRegistration`, `useBackgroundRegistration`, `useControlsRegistration`, `useLoadingRegistration`, `useContextMenuRegistration`, `useModalRegistration` |
| Store action veya batch          | `useRegistryActions`                                                                                                                                                                  |
| Bir effective value okumak       | `useRegistryValue` veya typed read hook                                                                                                                                               |
| Bir type'ın kayıtlarını okumak   | `useRegistryEntries`                                                                                                                                                                  |
| Özel selector                    | `useRegistrySelector`                                                                                                                                                                 |
| Store'u React dışında test etmek | `createRegistryStore`                                                                                                                                                                 |

Raw `register` çağrısını feature bileşenlerine yaymak yerine typed hook veya `usePageRegistry` kullanın.

Nav HUD kaydı producerın verdiği JSXi doğrudan Nav kartına taşır. Aynı anda etkin kayıtlar arasında en yüksek Registry prioritysi görünür; lifecycle ve cleanup yine Registry tarafından yürütülür.

React dışı platform mutation'ları için `store.transaction` kullanın; bu API
tek commit üretir ve `traceId` ile diagnostics akışını ilişkilendirir.

## Kullanım

Bir sayfanın ilişkili descriptor'larını tek lifecycle altında yayınlayın:

```jsx
function RecordPageRegistry({ record, isLoading }) {
  usePageRegistry({
    registry: { source: "record-page", priority: 220 },
    nav: { path: `/records/${record.id}`, title: record.title },
    background: { image: record.coverUrl, overlay: true },
    loading: { isLoading, minDuration: 300 },
  });

  return null;
}
```

Tek bir sorumluluk için typed hook daha okunaklıdır:

```jsx
function EditorModalRegistration() {
  useModalRegistration(
    { EDITOR_MODAL: EditorModal },
    {
      source: "editor-feature",
      validation: "strict",
    },
  );
  return null;
}
```

`source`, lifecycle sahibini tanımlar. `priority` çakışan kayıtların sırasını belirler. `enabled: false`, `null` veya `undefined` payload kayıt oluşturmaz.

## Lifecycle, validation ve kurallar

- Background, Context Menu, Loading ve Modal için en yüksek priority kazanır
- Nav ve Nav Runtime kayıtları düşük priority'den yükseğe merge edilir
- Singleton kayıtları yalnızca kendi canonical key'leriyle kabul edilir; path ve route key'leri kendi policy'lerine uymalıdır
- `warn` varsayılandır ve issue raporlar; `strict` geçersiz payload'ı store'a yazmaz
- Graceful kayıt cleanup gecikmesi boyunca son değeri koruyabilir
- Handle dispose işlemi yalnız kendi source/instance kaydını kaldırır
- Registry snapshot'ları immutable'dır; payload'ları doğrudan mutate etmeyin
- Built-in source dışındaki kaynaklar deterministik priority için açık `priority` vermelidir
- Diagnostics production'da no-op'tur

`persistent` kaydı explicit unregister edilene kadar bırakmayın. Aynı key'de birden çok instance varsa handle veya `instanceId` ile cleanup kapsamını koruyun. Metadata dışı control alanlarını payload'a eklemeyin.

## Doğrulama

```bash
npm test
npx eslint src/modules/registry
npx prettier --check src/modules/registry docs/modules/registry.md
```

Registry mutation sonucu dönen handle'ın `status` ve `reason` alanları reject ile
unchanged durumlarını ayırır. `batch` synchronous'tur ve tek commit üretir; listener
hataları Registry state'ini bozmaz. Cyclic veya aşırı derin config değerleri stabilization
sınırları içinde güvenle ele alınır.
