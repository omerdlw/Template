# Controls

`modules/controls`, aktif Nav kartının iki yanında sabit desktop araç alanları render eder. Domain, control içeriğini ve iş kuralını; Controls ise eşleştirmeyi, Nav ölçümünü ve portal yerleşimini yönetir.

## Sınır

Controls Nav state'i, route davranışı veya mobile trigger üretmez. `index.js` renderer ile `useControlsLayout` hook'unu, `layout.js` ise React'ten bağımsız pair ve geometri hesaplarını içerir.

## Kurulum

`Controls`ı uygulama kabuğunda Nav ile birlikte bir kez render edin:

```jsx
<NavigationProvider>
  {children}
  <Nav />
  <Controls />
</NavigationProvider>
```

Controls Registry provider'a da ihtiyaç duyar. Nav görünmüyorsa, mobil viewport'ta veya Nav controls'ü gizlediyse renderer görünmez.

## API seçimi

| İhtiyaç                  | API                                         |
| ------------------------ | ------------------------------------------- |
| Kök renderer             | `Controls`                                  |
| Nav'a göre özel yerleşim | `useControlsLayout`                         |
| Saf pair/ölçü testi      | `resolveControlsPairs`, `getControlsLayout` |
| Sayfa kaydı              | `useControlsRegistration`                   |

## Kullanım

Her satır için aynı `order` değerinde bir left ve bir right kaydı yayınlayın. Eşleşmeyen taraf render edilmez:

```jsx
function LibraryControls() {
  useControlsRegistration(
    [
      {
        id: "filters",
        path: "/library",
        side: "left",
        order: 0,
        content: <Filters />,
      },
      {
        id: "sort",
        path: "/library",
        side: "right",
        order: 0,
        content: <SortMenu />,
      },
    ],
    { source: "library-page" },
  );

  return null;
}
```

`id` route içinde stabil ve benzersiz olmalıdır. `order` verilmezse `0` kabul edilir. Aynı side/order için birden fazla kayıt varsa alfabetik olarak ilk `id` seçilir.

## Lifecycle ve kurallar

- Kayıt, component unmount olduğunda yalnız kendi source/instance kapsamından temizlenir
- Rail'ler `order`a göre alttan üste sıralanır
- `ResizeObserver` Nav kartı veya viewport değiştiğinde geometriyi yeniler
- Geometry gerçek Nav kartından okunur; Controls Nav modülüne JavaScript import etmez

Tekil left veya right kayıtları görünmez. Bu modül için ekstra wrapper, provider veya mobil davranış eklemeyin; bunlar farklı bir ürün sözleşmesidir.

## Doğrulama

```bash
npx prettier --check modules/controls/*.js modules/docs/controls.md
npx eslint modules/controls tests/modules.test.js
node --import ./scripts/register-alias.mjs --test tests/modules.test.js
```
