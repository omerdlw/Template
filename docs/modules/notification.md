# Notification

`modules/notification`, kısa toast'ları ve kalıcı kritik bildirimleri aynı provider altında yönetir. Domain mesajı ve domain event'i üretir; modül normalizasyon, timer, storage ve erişilebilir overlay lifecycle'ını yönetir.

## Sınır

`provider.js` state, critical persistence ve browser storage'ı; `toast.js` mesaj odaklı facade ile production policy'sini; `motion.js` interaction değerlerini; `index.js` renderer, listener ve public facade'ı içerir.

Kritik türler `PERMISSION_DENIED`, `SESSION_EXPIRED`, `SERVER_ERROR` ve `OFFLINE`dır. Toast türleri `SUCCESS`, `WARNING`, `ERROR` ve `INFO`dur. Yalnız kritik türler refresh sonrasında geri yüklenir.

## Kurulum

```jsx
<NotificationProvider>
  {children}
  <NotificationListener />
  <NotificationContainer />
</NotificationProvider>
```

Provider, listener ve container'ı uygulama kabuğunda bir kez mount edin. `NotificationBadgeListener` eski kullanımlar için no-op compatibility bileşenidir.

## API seçimi

| İhtiyaç                         | API                                                     |
| ------------------------------- | ------------------------------------------------------- |
| Normal kullanıcı geri bildirimi | `useToast`                                              |
| Kalıcı veya kritik durum        | `useNotificationActions`                                |
| Notification state'i            | `useNotificationState`                                  |
| Root görünümü                   | `NotificationContainer`, `NotificationListener`         |
| SSR-safe browser storage        | `getStorageItem`, `setStorageItem`, `removeStorageItem` |

## Kullanım

Başarılı veya hatalı kısa işler için `useToast` kullanın. Aynı iş tekrarlandığında stabil bir `dedupeKey` verin:

```jsx
function SaveButton() {
  const toast = useToast();

  async function save() {
    try {
      await saveChanges();
      toast.success("Changes saved", { allowInProduction: true });
    } catch (error) {
      toast.error(error?.message || "Changes could not be saved", {
        dedupeKey: "save-changes-error",
        description: "Try again in a moment.",
      });
    }
  }

  return <Button onClick={save}>Save</Button>;
}
```

Production'da `SUCCESS` ve `INFO` toast'ları varsayılan olarak gösterilmez. Gerekliyse `allowInProduction: true` verin. Default süreler success/info için 3000 ms, warning/error için 4000 ms'dir.

Kritik durumları düşük seviye action ile yayınlayın:

```jsx
function OfflineBridge() {
  const { dismissNotification, showNotification } = useNotificationActions();

  return (
    <Button
      onClick={() =>
        showNotification(CRITICAL_TYPES.OFFLINE, {
          id: "network-offline",
          message: "You are currently offline",
          actions: [
            {
              label: "Dismiss",
              dismiss: true,
              onClick: () => dismissNotification("network-offline"),
            },
          ],
        })
      }
    >
      Show offline state
    </Button>
  );
}
```

Action descriptor `label`, `onClick`, `dismiss` ve `className` kabul eder. `dismiss: false`, action sonrası bildirimi açık bırakır.

## Lifecycle ve kurallar

- Aynı id mevcut kaydı günceller; `dedupeKey`, toast için id'den önce gelir
- Auto-dismiss yalnız dismissible notification'larda çalışır
- Auto-dismiss olmayan dismissible notification close düğmesi gösterir
- `NotificationListener`, uygun `API_UNAUTHORIZED` olayını session-expired critical notification'a çevirir
- Bozuk storage ve geçersiz critical kayıt güvenli biçimde temizlenir

Domain event'lerini bu modülde üretmeyin. Payload'a token veya gereksiz kişisel veri koymayın. Motion değerlerini feature içinde ikinci kez tanımlamayın.

## Doğrulama

```bash
npm test
npx eslint src/modules/notification
npx prettier --check src/modules/notification docs/modules/notification.md
```
