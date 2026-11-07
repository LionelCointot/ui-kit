# Clean Code : exemples avant / après

## 1. Gardes en tête au lieu d'imbrications (TypeScript)

Avant :
```ts
function getDiscount(user: User | null, cart: Cart): number {
  if (user) {
    if (user.isActive) {
      if (cart.total > 100) {
        return cart.total * 0.1;
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  }
  return 0;
}
```

Après :
```ts
const DISCOUNT_THRESHOLD = 100;
const DISCOUNT_RATE = 0.1;

function getDiscount(user: User | null, cart: Cart): number {
  if (!user?.isActive) return 0;
  if (cart.total <= DISCOUNT_THRESHOLD) return 0;
  return cart.total * DISCOUNT_RATE;
}
```

## 2. Paramètre booléen et paramètres trop nombreux (C#)

Avant :
```csharp
public Report Export(DateOnly from, DateOnly to, string f, bool z, int max) { ... }
var r = Export(start, end, "pdf", true, 500);   // que veut dire true ? 500 quoi ?
```

Après :
```csharp
public enum ReportFormat { Pdf, Csv }

public sealed record ReportRequest(
    DateOnly From,
    DateOnly To,
    ReportFormat Format,
    bool Compress,
    int MaxRows);

public Report Export(ReportRequest request) { ... }

var report = exporter.Export(new ReportRequest(
    From: start,
    To: end,
    Format: ReportFormat.Pdf,
    Compress: true,
    MaxRows: 500));
```

## 3. Logique pure séparée des effets (TypeScript)

Avant : le calcul, l'horloge et l'appel HTTP sont mélangés, impossible à tester sans réseau.
```ts
async function saveIfOverdue(invoice: Invoice) {
  if (new Date() > new Date(invoice.dueDate) && invoice.status !== 'paid') {
    invoice.status = 'overdue';
    await fetch(`/api/invoices/${invoice.id}`, { method: 'PUT', body: JSON.stringify(invoice) });
  }
}
```

Après : une fonction pure testable, l'effet est ailleurs (store / service).
```ts
export function isOverdue(invoice: Invoice, today: Date): boolean {
  return invoice.status !== 'paid' && today > invoice.dueDate;
}

// dans le store
async markOverdueInvoices(): Promise<void> {
  const today = this.clock.now();
  const overdue = this.invoices().filter((invoice) => isOverdue(invoice, today));
  await Promise.all(overdue.map((invoice) => firstValueFrom(this.api.markOverdue(invoice.id))));
}
```

## 4. Erreur avalée (C#)

Avant :
```csharp
try { await store.SaveAsync(document, ct); }
catch (Exception) { }   // l'utilisateur croit avoir sauvegardé
```

Après : on laisse remonter au gestionnaire central (ProblemDetails 500), ou on gère un cas précis et attendu.
```csharp
try
{
    await store.SaveAsync(document, ct);
}
catch (IOException ex) when (ex.HResult == DiskFullHResult)
{
    throw new BusinessRuleException("STORAGE_FULL", "Espace disque insuffisant pour sauvegarder le document.", ex);
}
```

## 5. États incohérents (TypeScript)

Avant : `loading`, `error` et `data` peuvent être vrais en même temps.
```ts
loading = false; error: string | null = null; data: Result | null = null;
```

Après : une union discriminée, un seul état possible à la fois.
```ts
type LoadState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };
```
(En Angular, `resource()` / `rxResource()` fournissent déjà ce statut : voir `angular-best-practices`.)

## 6. Commentaire « quoi » vs « pourquoi »

Avant :
```csharp
// on arrondit
var interest = Math.Round(balance * rate, 2);
```

Après :
```csharp
// Arrondi à chaque ligne (et non sur le total) pour que la somme affichée corresponde aux lignes ;
// AwayFromZero est la règle d'arrondi commerciale attendue par le métier.
var lineTotal = decimal.Round(quantity * unitPrice, 2, MidpointRounding.AwayFromZero);
```
