using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Cadence.Infrastructure.Persistence;

public sealed class CadenceDbContextFactory : IDesignTimeDbContextFactory<CadenceDbContext>
{
    public CadenceDbContext CreateDbContext(string[] args)
    {
        var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
            ?? "Host=localhost;Port=5432;Database=cadence;Username=cadence;Password=local-dev-only";
        var options = new DbContextOptionsBuilder<CadenceDbContext>()
            .UseNpgsql(connectionString)
            .Options;
        return new CadenceDbContext(options);
    }
}
