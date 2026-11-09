namespace Cadence.Domain.Entities;

public sealed class BoardColumn
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid BoardId { get; set; }
    public Board? Board { get; set; }
    public string Name { get; set; } = string.Empty;
    public int Position { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
}
