# .NET : exemples génériques

## 1. Service métier (aucune dépendance web)
```csharp
namespace App.Core.Orders;

public sealed record Order(Guid Id, string CustomerName, decimal Total, DateTimeOffset CreatedAt);
public sealed record CreateOrder(string CustomerName, decimal Total);

public interface IOrderRepository
{
    Task<Order?> FindAsync(Guid id, CancellationToken ct);
    Task AddAsync(Order order, CancellationToken ct);
}

public sealed class OrderService(IOrderRepository repository, TimeProvider clock)
{
    public Task<Order?> FindAsync(Guid id, CancellationToken ct) => repository.FindAsync(id, ct);

    public async Task<Order> CreateAsync(CreateOrder command, CancellationToken ct)
    {
        var order = new Order(Guid.NewGuid(), command.CustomerName.Trim(), command.Total, clock.GetUtcNow());
        await repository.AddAsync(order, ct);
        return order;
    }
}
```

## 2. Endpoints (traduction HTTP, rien de plus)
```csharp
namespace App.Api.Orders;

public sealed record CreateOrderRequest(string CustomerName, decimal Total);
public sealed record OrderResponse(Guid Id, string CustomerName, decimal Total);

public static class OrdersEndpoints
{
    public static IEndpointRouteBuilder MapOrdersEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/v1/orders").WithTags("Orders");
        group.MapGet("/{id:guid}", GetById).WithName(nameof(GetById));
        group.MapPost("/", Create);
        return routes;
    }

    private static async Task<Results<Ok<OrderResponse>, NotFound>> GetById(
        Guid id, OrderService service, CancellationToken ct)
    {
        var order = await service.FindAsync(id, ct);
        return order is null
            ? TypedResults.NotFound()
            : TypedResults.Ok(new OrderResponse(order.Id, order.CustomerName, order.Total));
    }

    private static async Task<CreatedAtRoute<OrderResponse>> Create(
        CreateOrderRequest request, OrderService service, CancellationToken ct)
    {
        var order = await service.CreateAsync(new CreateOrder(request.CustomerName, request.Total), ct);
        return TypedResults.CreatedAtRoute(
            new OrderResponse(order.Id, order.CustomerName, order.Total), nameof(GetById), new { id = order.Id });
    }
}
```

## 3. Program.cs : erreurs standard et OpenAPI automatique
```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();              // format d'erreur standard
builder.Services.AddOpenApi();                     // document généré à partir des endpoints
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<IOrderRepository, SqlOrderRepository>();

var app = builder.Build();

app.UseExceptionHandler();
app.MapOpenApi();                                  // /openapi/v1.json, source du client front
app.MapOrdersEndpoints();

app.Run();

public partial class Program;                      // pour WebApplicationFactory<Program>
```

## 4. Tests
```csharp
public sealed class OrderServiceTests
{
    [Fact]
    public async Task CreateAsync_StampsCreationDateFromClock()
    {
        var now = new DateTimeOffset(2026, 1, 15, 10, 0, 0, TimeSpan.Zero);
        var service = new OrderService(new FakeOrderRepository(), new FakeTimeProvider(now));

        var order = await service.CreateAsync(new CreateOrder("  Alice ", 42m), CancellationToken.None);

        Assert.Equal(now, order.CreatedAt);
        Assert.Equal("Alice", order.CustomerName);
    }
}

public sealed class OrdersApiTests(WebApplicationFactory<Program> factory)
    : IClassFixture<WebApplicationFactory<Program>>
{
    [Fact]
    public async Task Get_UnknownId_Returns404()
    {
        var response = await factory.CreateClient().GetAsync($"/api/v1/orders/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
```
