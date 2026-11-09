using System.ComponentModel.DataAnnotations;

namespace Cadence.Application.Contracts;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(8), MaxLength(100)] string Password);

public sealed record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public sealed record CreateBoardRequest(
    [Required, MinLength(1), MaxLength(120)] string Name,
    [MaxLength(1000)] string? Description);

public sealed record UpdateBoardRequest(
    [Required, MinLength(1), MaxLength(120)] string Name,
    [MaxLength(1000)] string? Description);

public sealed record AddMemberRequest(Guid UserId, string Role = "Editor");

public sealed record CreateColumnRequest(
    [Required, MinLength(1), MaxLength(80)] string Name,
    int? Position);

public sealed record UpdateColumnRequest(
    [Required, MinLength(1), MaxLength(80)] string Name,
    int Position);

public sealed record CreateTaskRequest(
    [Required, MinLength(1), MaxLength(200)] string Title,
    [MaxLength(5000)] string? Description,
    Guid? AssigneeId,
    DateTimeOffset? DueDate,
    int? Position);

public sealed record UpdateTaskRequest(
    [Required, MinLength(1), MaxLength(200)] string Title,
    [MaxLength(5000)] string? Description,
    Guid? AssigneeId,
    DateTimeOffset? DueDate);

public sealed record MoveTaskRequest(Guid TargetColumnId, int Position);
