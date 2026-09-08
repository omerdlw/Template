# Context menu

`modules/context-menu`, browser `contextmenu` olayını aktif Registry adayına bağlar ve erişilebilir bir portal menüsü render eder. Domain callback'i ve domain payload anlamı menü tanımını yayınlayan feature'a aittir.

## Sınır

Modül aday seçimi, item normalizasyonu, viewport konumu, focus, klavye, outside click, Escape ve scroll lock yönetir. Menü action'larının iş kuralını veya backend state'ini yönetmez.

| Dosya          | Sorumluluk                                   |
| -------------- | -------------------------------------------- |
| `constants.js` | Yerleşim ve margin sabitleri                 |
| `utils.js`     | Saf yardımcılar, node text ve lock kontrolü  |
| `resolver.js`  | Aday, header, item ve konum çözümü           |
| `provider.js`  | Native event listener ile open/close state'i |
| `motion.js`    | Menu motion değerleri                        |
| `index.js`     | Public facade ve portal görünümü             |

## Kurulum

```jsx
<RegistryProvider>
  <ContextMenuProvider>
    {children}
    <ContextMenuGlobal />
  </ContextMenuProvider>
</RegistryProvider>
```

`ContextMenuGlobal` listener ve renderer'ı birlikte kurar. Uygulama kabuğunda bir kez kullanın.

## API seçimi

| İhtiyaç                       | API                                      |
| ----------------------------- | ---------------------------------------- |
| Standart global kurulum       | `ContextMenuGlobal`                      |
| Özel renderer                 | `ContextMenuRenderer`                    |
| Açık menü state/action'ı      | `useContextMenu`                         |
| Ayrı native listener          | `useContextMenuListener`                 |
| Bir feature menüsü yayınlamak | `useContextMenuRegistration`             |
| Tanımı test etmek             | `resolveContextMenu`, `resolveMenuItems` |

## Kullanım

Menu kaydını ilgili feature içinde yayınlayın. `target`, hangi DOM elemanının kaydı tetiklediğini belirler:

```jsx
function MediaMenuRegistration({ openMedia, removeMedia }) {
  useContextMenuRegistration(
    {
      target: "[data-media-card]",
      priority: 10,
      items: ({ target }) => [
        {
          key: "open",
          label: "Open",
          onSelect: () => openMedia(target.dataset.id),
        },
        "separator",
        {
          key: "remove",
          label: "Remove",
          danger: true,
          onSelect: () => removeMedia(target.dataset.id),
        },
      ],
    },
    { source: "media-page" },
  );

  return null;
}
```

`items`, `header`, `when`, `enabled`, `payload` ve `resolveContext` value veya function olabilir. Item'lar için `key`, `label`, `icon`, `shortcut`, `disabled`, `hidden`, `danger`, `onSelect`, `className` ve `itemIconClassName` kullanabilirsiniz. `'separator'` ile başta, sonda veya art arda oluşan ayraçlar kaldırılır.

Manuel açma yalnız özel trigger'lar içindir:

```jsx
function Trigger({ config }) {
  const { openMenu } = useContextMenu();
  return (
    <button
      onContextMenu={(event) => openMenu(config, event.clientX, event.clientY)}
    >
      Open
    </button>
  );
}
```

## Lifecycle ve kurallar

- En yüksek aday skoru seçilir; eşitlikte ilk Registry kaydı kalır
- `onOpen` false döndürürse menü açılmaz
- `onClose` ve async item callback hataları render akışını bozmaz
- Arrow tuşları disabled item'ları atlar; Enter/Space seçer, Escape kapatır
- Menü viewport dışına taşarsa konum içeri alınır

Her item'a stabil `key` verin. Disabled item görünür kalır; gizlemek için `hidden` kullanın. Global renderer'ı veya listener'ı route layout'larında tekrar mount etmeyin.

## Doğrulama

```bash
npm test
npx eslint src/modules/context-menu
npx prettier --check src/modules/context-menu docs/modules/context-menu.md
```
