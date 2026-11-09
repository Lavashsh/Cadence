using Microsoft.AspNetCore.Identity;

namespace Cadence.Domain.Entities;

public sealed class AppUser : IdentityUser<Guid>
{
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<BoardMember> BoardMemberships { get; set; } = new List<BoardMember>();
    public ICollection<Board> OwnedBoards { get; set; } = new List<Board>();
}
