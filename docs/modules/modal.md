# Modal

`modules/modal`, Registry'ye kaydedilmiş geçici yüzeyleri stack, portal, focus trap ve kapanış sonucu sözleşmesiyle gösterir. Modalın içeriği, başlığı ve iş akışı onu açan domain'e aittir.

## Sınır

Modül stack sırasını, backdrop/Escape kapanışını, responsive position'ı, focus dönüşünü ve `openModal` Promise'ini yönetir. Domain state'i, API çağrısı, modal kaydı ve ürün metni yönetmez.

| Dosya        | Sorumluluk                                             |
| ------------ | ------------------------------------------------------ |
| `index.js`   | Public facade, portal renderer, `Modal` ve `Container` |
| `runtime.js` | Stack, Promise, close callback ve focus lifecycle'ı    |
| `config.js`  | Position, chrome ve generic header sözleşmesi          |
| `motion.js`  | Modal motion değerleri                                 |

## Kurulum

Registry'yi önce kurun ve `ModalProvider`ı uygulama kabuğunda bir kez mount edin:

```jsx
<RegistryProvider>
  <ModalProvider>{children}</ModalProvider>
</RegistryProvider>
```

## API seçimi

| İhtiyaç                          | API                               |
| -------------------------------- | --------------------------------- |
| Modal açmak veya kapatmak        | `useModalActions`                 |
| Stack'i okumak                   | `useModalState`                   |
| İki ihtiyacı birlikte karşılamak | `useModal`                        |
| Ortak panel düzeni               | `Container` veya `ModalContainer` |
| Modal component'i yayınlamak     | `useModalRegistration`            |

`openModal(modalType, position, config)` bir Promise döndürür. `closeModal(result)` ve `closeAllModals(result)` aynı sonucu Promise ile `onClose` callback'ine iletir.

## Kullanım

Önce component'i Registry'ye kaydedin. Kayıt, onu açan feature'ın lifecycle'ında kalmalıdır:

```jsx
function PreviewModal({ data, close }) {
  return (
    <Button onClick={() => close({ confirmed: true })}>{data.title}</Button>
  );
}

function PreviewModalRegistration() {
  useModalRegistration(
    { PREVIEW_MODAL: PreviewModal },
    { source: "media-page" },
  );
  return null;
}
```

Ardından header ve chrome kararını açıkça verin:

```jsx
function PreviewButton({ record }) {
  const { openModal } = useModalActions();

  async function openPreview() {
    const result = await openModal("PREVIEW_MODAL", "center", {
      data: record,
      header: { title: record.title, showClose: true },
      chrome: "bare",
    });
    if (result?.confirmed) refreshRecord(record.id);
  }

  return <Button onClick={openPreview}>Preview</Button>;
}
```

Position string veya responsive descriptor olabilir. `config.responsivePosition`, ikinci parametredeki descriptor'ı override eder:

```js
openModal(
  "EDITOR_MODAL",
  { mobile: "bottom", desktop: "center" },
  {
    responsivePosition: { mobile: "bottom", desktop: "right" },
    header: { title: "Edit item" },
  },
);
```

`data` modal component'ine payload olarak geçer. `data` verilmezse uyumluluk için config object'i payload olur. Header sırası yalnız `config.header`, sonra kısa form `title`, `actions`, `showClose` alanlarıdır; modal type'a göre gizli başlık veya preset çözümü yoktur.

## Lifecycle ve kurallar

- Üstte aynı type açıksa yeni çağrı `null` ile çözülür
- Stack'te altta kalan aynı type kapanır, yeni entry üste eklenir
- Backdrop, Escape ve close düğmesi yalnız üst modalı kapatır
- Son modal kapanınca scroll lock kaldırılır ve önceki focus geri yüklenir
- Callback hatası close lifecycle'ını bozmaz

Payload'ı `data` altında tutun. Modalın kontrol alanlarını payload'a karıştırmayın. `ModalProvider`ı route bazında tekrar kurmayın.

## Doğrulama

```bash
npx prettier --check modules/modal/*.js modules/docs/modal.md
npx eslint modules/modal/*.js
node --import ./scripts/register-alias.mjs --test tests/modules.test.js
```
