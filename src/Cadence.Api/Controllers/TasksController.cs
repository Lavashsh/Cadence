using System.Security.Claims;
using Cadence.Application.Contracts;
using Cadence.Domain.Entities;
using Cadence.Infrastructure.Persistence;
using Cadence.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Api.Controllers;

[ApiController, Authorize]
[Route("api/boards/{boardId:guid}")]
public sealed class TasksController(CadenceDbContext db, BoardAccessService access) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("tasks")]
    public async Task<IActionResult> GetAll(Guid boardId, CancellationToken ct)
    {
        if (!await access.CanReadAsync(boardId, UserId, ct)) return NotFound();
        var tasks = await db.Tasks.AsNoTracking().Where(x => x.BoardId == boardId)
            .OrderBy(x => x.Column!.Position).ThenBy(x => x.Position)
            .Select(x => new { x.Id, x.ColumnId, x.Title, x.Description, x.AssigneeId, x.DueDate, x.Position, x.CreatedAt, x.UpdatedAt })
            .ToListAsync(ct);
        return Ok(tasks);
    }

    [HttpPost("columns/{columnId:guid}/tasks")]
    public async Task<IActionResult> Create(Guid boardId, Guid columnId, CreateTaskRequest request, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var column = await db.Columns.FirstOrDefaultAsync(x => x.Id == columnId && x.BoardId == boardId, ct);
        if (column is null) return NotFound();
        if (request.AssigneeId.HasValue &&
            !await db.BoardMembers.AnyAsync(x => x.BoardId == boardId && x.UserId == request.AssigneeId, ct))
            return BadRequest(new { message = "Assignee must be a member of this board." });

        var max = await db.Tasks.Where(x => x.ColumnId == columnId)
            .Select(x => (int?)x.Position).MaxAsync(ct) ?? -1;
        var task = new TaskItem
        {
            BoardId = boardId, ColumnId = columnId, Title = request.Title.Trim(),
            Description = request.Description, AssigneeId = request.AssigneeId,
            DueDate = request.DueDate, Position = request.Position ?? max + 1
        };
        db.Tasks.Add(task);
        await db.SaveChangesAsync(ct);
        return Created($"/api/boards/{boardId}/tasks/{task.Id}", new
        {
            task.Id, task.ColumnId, task.Title, task.Description, task.AssigneeId,
            task.DueDate, task.Position, task.CreatedAt, task.UpdatedAt
        });
    }

    [HttpPut("tasks/{taskId:guid}")]
    public async Task<IActionResult> Update(Guid boardId, Guid taskId, UpdateTaskRequest request, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var task = await db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId && x.BoardId == boardId, ct);
        if (task is null) return NotFound();
        if (request.AssigneeId.HasValue &&
            !await db.BoardMembers.AnyAsync(x => x.BoardId == boardId && x.UserId == request.AssigneeId, ct))
            return BadRequest(new { message = "Assignee must be a member of this board." });
        task.Title = request.Title.Trim();
        task.Description = request.Description;
        task.AssigneeId = request.AssigneeId;
        task.DueDate = request.DueDate;
        task.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("tasks/{taskId:guid}/move")]
    public async Task<IActionResult> Move(Guid boardId, Guid taskId, MoveTaskRequest request, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var task = await db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId && x.BoardId == boardId, ct);
        if (task is null) return NotFound();
        var target = await db.Columns.FirstOrDefaultAsync(x => x.Id == request.TargetColumnId && x.BoardId == boardId, ct);
        if (target is null) return BadRequest(new { message = "Target column does not belong to this board." });

        task.ColumnId = target.Id;
        task.Position = Math.Max(0, request.Position);
        task.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("tasks/{taskId:guid}")]
    public async Task<IActionResult> Delete(Guid boardId, Guid taskId, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var task = await db.Tasks.FirstOrDefaultAsync(x => x.Id == taskId && x.BoardId == boardId, ct);
        if (task is null) return NotFound();
        db.Tasks.Remove(task);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
