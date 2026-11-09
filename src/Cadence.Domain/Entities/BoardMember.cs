namespace Cadence.Domain.Entities;

public enum BoardRole { Owner = 0, Editor = 1, Viewer = 2 }

public sealed class BoardMember
{
    public Guid BoardId { get; set; }
    public Board? Board { get; set; }
    public Guid UserId { get; set; }
    public AppUser? User { get; set; }
    public BoardRole Role { get; set; } = BoardRole.Editor;
    public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;
}
