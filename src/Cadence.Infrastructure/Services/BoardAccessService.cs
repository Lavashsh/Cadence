using Cadence.Domain.Entities;
using Cadence.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Services;

public sealed class BoardAccessService(CadenceDbContext db)
{
    public async Task<BoardRole?> GetRoleAsync(Guid boardId, Guid userId, CancellationToken ct)
    {
        var role = await db.BoardMembers.AsNoTracking()
            .Where(x => x.BoardId == boardId && x.UserId == userId)
            .Select(x => (BoardRole?)x.Role).FirstOrDefaultAsync(ct);
        return role;
    }

    public async Task<bool> CanReadAsync(Guid boardId, Guid userId, CancellationToken ct) =>
        await db.BoardMembers.AnyAsync(x => x.BoardId == boardId && x.UserId == userId, ct);

    public async Task<bool> CanEditAsync(Guid boardId, Guid userId, CancellationToken ct) =>
        await db.BoardMembers.AnyAsync(x => x.BoardId == boardId && x.UserId == userId &&
            (x.Role == BoardRole.Owner || x.Role == BoardRole.Editor), ct);

    public async Task<bool> IsOwnerAsync(Guid boardId, Guid userId, CancellationToken ct) =>
        await db.BoardMembers.AnyAsync(x => x.BoardId == boardId && x.UserId == userId &&
            x.Role == BoardRole.Owner, ct);
}
