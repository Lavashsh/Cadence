namespace Cadence.Domain.Entities;

public sealed class TaskItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BoardId { get; set; }
    public Guid ColumnId { get; set; }
    public BoardColumn? Column { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? AssigneeId { get; set; }
    public AppUser? Assignee { get; set; }
    public DateTimeOffset? DueDate { get; set; }
    public int Position { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
