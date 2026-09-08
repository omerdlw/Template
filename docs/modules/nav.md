# Nav

`modules/nav`, Registry'den çözülen kart tabanlı navigation'ı; surface, HUD, command, breadcrumb, guard ve route continuity ile birlikte yönetir. Domain, kart descriptor'ını, surface içeriğini ve iş kuralını yayınlar.

## Sınır

Nav route kartlarını ve geçici navigation UI'ını yönetir. Domain API'leri, ürün metni, sayfa state'i ve route'a ait veri yükleme modülün dışında kalır.

| Dosya            | Sorumluluk                                                             |
| ---------------- | ---------------------------------------------------------------------- |
| `index.js`       | Public facade ve Nav stack renderer                                    |
| `provider.js`    | Provider composition, context, guard, state ve display hook'ları       |
| `runtime.js`     | Operation state, diagnostic store ve selector store                    |
| `surface.js`     | Surface stack, flow, return handshake ve extensions                    |
| `scheduler.js`   | Enjekte edilebilir timer/frame zamanlaması                             |
| `hud.js`         | HUD descriptor, seçim, Registry lifecycle ve görünüm                   |
| `routing.js`     | Path normalizasyonu, route policy, transaction, continuity ve topology |
| `layout.js`      | Kart stili, kimlik, DOM ölçümü ve viewport geometrisi                  |
| `behavior.js`    | Focus, klavye, scroll ve compact etkileşimi                            |
| `cards.js`       | Nav kartı ve header/body render bileşenleri                            |
| `commands.js`    | Command kaydı, görünürlük, sıralama ve command bar                     |
| `breadcrumbs.js` | Breadcrumb çözümü, override provider ve görünüm                        |
| `media.js`       | Medya kontrolleri, scrubber ve süre biçimlendirmesi                    |
| `status.js`      | Paylaşılan olaylardan status çözümü ve status görünümü                 |
| `constants.js`   | Nav seçenekleri, durum adları ve tasarım sabitleri                     |
| `motion.js`      | Animasyon değerleri, transition ve choreography hesapları              |
| `utils.js`       | Ortak değer/React node normalizasyonu ve sığ karşılaştırma             |

## Kurulum

`NavigationProvider`ı Registry altında uzun ömürlü olarak kurun. `Nav`ı kabukta bir kez render edin:

```jsx
<RegistryProvider>
  <NavigationProvider>
    {children}
    <Nav />
  </NavigationProvider>
</RegistryProvider>
```

Provider'ı route bazında tekrar kurmayın. Surface, operation ve continuity state'i provider ömrü boyunca yaşar.

## API seçimi

| İhtiyaç                           | API                                                           |
| --------------------------------- | ------------------------------------------------------------- |
| Navigation state/action           | `useNavigation`, `useNavigationState`, `useNavigationActions` |
| Dar state aboneliği               | `useNavigationSelector`                                       |
| Route kartı yayınlamak            | `useNavRegistration`                                          |
| Surface açmak veya akış yürütmek  | `useNavigationActions`, `useSurfaceFlow`                      |
| HUD                               | `useNavHud`, `createHudDefinition`                            |
| Uzun iş                           | `useNavigationOperations`                                     |
| Kaydedilmemiş değişiklik koruması | `useNavigationGuard`                                          |
| Breadcrumb override               | `useRegisterBreadcrumbOverride`                               |
| Kart üzeri yardımcı kontrol       | `NavSurfaceExtension`, `useSurfaceExtensions`                 |
| Scroll/focus dönüşü               | `useNavigationContinuityState`, `useSurfaceReturn`            |

HUD progress değeri `0` ile `100`, operation progress değeri `0` ile `1` arasındadır.

HUD kartı hazır başlık, ikon, progress veya kapatma kontrolü render etmez. Producer content JSX nodeuna tam sahip olur; Registry üzerinden yayınlamak için useNavHudRegistration kullanılır.

## Kullanım

Kart tanımını onu sahiplenen feature içinde yayınlayın:

```jsx
function LibraryNavRegistration() {
  useNavRegistration(
    {
      path: "/library",
      title: "Library",
      description: "Saved items",
      icon: "lucide:bookmark",
    },
    { source: "library-page", priority: 100 },
  );
  return null;
}
```

Surface mevcut kartın üzerinde görev odaklı içerik açar:

```jsx
function DetailsAction({ itemId }) {
  const { openSurface } = useNavigationActions();

  return (
    <Button
      onClick={() =>
        openSurface({
          component: DetailsSurface,
          props: { itemId },
          title: "Details",
        })
      }
    >
      Open details
    </Button>
  );
}
```

Kaydedilmemiş değişiklikte guard'ı doğrudan editörün lifecycle'ına bağlayın:

```jsx
function Editor({ hasUnsavedChanges }) {
  useNavigationGuard({ when: hasUnsavedChanges, message: "Unsaved changes" });
  return <EditorForm />;
}
```

Guard engellemesi sayfa düzeyinde bir UI veya surface açmaz; doğrudan Nav dock kartının başlığını (ikon, başlık, açıklama) günceller ve `Kal` / `Yine de Geç` action butonlarını render eder (Nav status mimarisi).

Uzun süren iş için Operation Center kullanın:

```jsx
function SyncButton({ synchronize }) {
  const operations = useNavigationOperations();

  async function sync() {
    const operation = operations.start({ label: "Synchronizing", progress: 0 });
    try {
      await synchronize();
      operations.complete(operation.id, { success: true });
    } catch (error) {
      operations.complete(operation.id, { success: false, error });
    }
  }

  return <Button onClick={sync}>Synchronize</Button>;
}
```

## Lifecycle ve kurallar

- Surface açma/kapatma koreografisi saf bir transition çekirdeğinden geçer; gecikmeler tek scheduler tarafından yürütülür
- Yeni bir surface olayı devam eden koreografiyi deterministik biçimde tamamlar; böylece hızlı open/close yarışları eski timer bırakmaz
- Yeni navigation transaction eski işlemi supersede edebilir; guard'lar geçişten önce çalışır ve engelleme Nav status olarak dock üzerinde buton aksiyonlarıyla gösterilir
- Surface stack'te altta kalan yüzeyler state'i korumak için unmount edilmez
- Flow sonucu, güvenli iç route'a return handshake ile bir kez teslim edilebilir
- HUD en yüksek priority ile seçilir
- Context action, breadcrumb override ve guard kayıtları unmount'ta temizlenir

Kart ve surface tanımlarını stabil `id`/`key` ile üretin. Domain state'ini Nav reducer'a koymayın. Aynı sayfada `useNavHeight` padding'i ile `NavHeightSpacer`ı birlikte kullanmayın.

Render için tek veya birkaç Nav alanı yeterliyse `useNavigationState` yerine
`useNavigationSelector` kullanın. Selector saf olmalı; birden fazla alan döndürüyorsa stabil bir
eşitlik fonksiyonu verin. Deterministik scheduler ve transition sürücüsü internal seam'lerdir;
colocated Nav testleri bu davranışları sahiplerinin yanında doğrular.

## Doğrulama

```bash
npm test
npx eslint src/modules/nav
npx prettier --check src/modules/nav docs/modules/nav.md
```
