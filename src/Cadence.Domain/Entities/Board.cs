namespace Cadence.Domain.Entities;

public sealed class Board
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid OwnerId { get; set; }
    public AppUser? Owner { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<BoardMember> Members { get; set; } = new List<BoardMember>();
    public ICollection<BoardColumn> Columns { get; set; } = new List<BoardColumn>();
}
