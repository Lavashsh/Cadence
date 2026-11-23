using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Cadence.Tests;

public sealed class ScenarioTests : IClassFixture<TestApiFactory>
{
    private readonly HttpClient client;

    public ScenarioTests(TestApiFactory factory) => client = factory.CreateClient();

    [Fact]
    public async Task User_can_register_create_board_and_manage_tasks()
    {
        var email = $"test-{Guid.NewGuid():N}@example.test";
        var password = "Cadence-test-123";
        var registered = await client.PostAsJsonAsync("/api/auth/register", new { email, password });
        Assert.Equal(HttpStatusCode.Created, registered.StatusCode);

        var login = await client.PostAsJsonAsync("/api/auth/login", new { email, password });
        login.EnsureSuccessStatusCode();
        using var loginJson = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        var token = loginJson.RootElement.GetProperty("accessToken").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);

        var created = await client.PostAsJsonAsync("/api/boards", new { name = "Acceptance board", description = "Scenario check" });
        created.EnsureSuccessStatusCode();
        using var createdJson = JsonDocument.Parse(await created.Content.ReadAsStringAsync());
        var boardId = createdJson.RootElement.GetProperty("id").GetGuid();

        var boardResponse = await client.GetAsync($"/api/boards/{boardId}");
        boardResponse.EnsureSuccessStatusCode();
        using var board = JsonDocument.Parse(await boardResponse.Content.ReadAsStringAsync());
        var columnId = board.RootElement.GetProperty("columns")[0].GetProperty("id").GetGuid();

        var taskResponse = await client.PostAsJsonAsync($"/api/boards/{boardId}/columns/{columnId}/tasks", new { title = "First task", description = "Check CRUD" });
        taskResponse.EnsureSuccessStatusCode();
        using var taskJson = JsonDocument.Parse(await taskResponse.Content.ReadAsStringAsync());
        var taskId = taskJson.RootElement.GetProperty("id").GetGuid();

        Assert.Equal(HttpStatusCode.NoContent, (await client.PutAsJsonAsync($"/api/boards/{boardId}/tasks/{taskId}", new { title = "Updated task", description = "Edited" })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PatchAsJsonAsync($"/api/boards/{boardId}/tasks/{taskId}/move", new { targetColumnId = columnId, position = 0 })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/boards/{boardId}/tasks/{taskId}")).StatusCode);
    }
}

public sealed class TestApiFactory : WebApplicationFactory<global::Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var connection = Environment.GetEnvironmentVariable("TEST_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=cadence;Username=cadence;Password=change-this-local-password";
        builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:Default"] = connection,
            ["Jwt:Key"] = "test-secret-key-for-cadence-at-least-32-bytes",
            ["Jwt:Issuer"] = "Cadence",
            ["Jwt:Audience"] = "Cadence.Client"
        }));
    }
}
