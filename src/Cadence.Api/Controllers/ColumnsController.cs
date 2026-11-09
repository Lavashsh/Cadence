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
[Route("api/boards/{boardId:guid}/columns")]
public sealed class ColumnsController(CadenceDbContext db, BoardAccessService access) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> Create(Guid boardId, CreateColumnRequest request, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var exists = await db.Boards.AnyAsync(x => x.Id == boardId, ct);
        if (!exists) return NotFound();
        var max = await db.Columns.Where(x => x.BoardId == boardId)
            .Select(x => (int?)x.Position).MaxAsync(ct) ?? -1;
        var column = new BoardColumn
        {
            BoardId = boardId, Name = request.Name.Trim(),
            Position = request.Position ?? max + 1
        };
        db.Columns.Add(column);
        await db.SaveChangesAsync(ct);
        return Created($"/api/boards/{boardId}/columns/{column.Id}", new { column.Id, column.Name, column.Position });
    }

    [HttpPut("{columnId:guid}")]
    public async Task<IActionResult> Update(Guid boardId, Guid columnId, UpdateColumnRequest request, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var column = await db.Columns.FirstOrDefaultAsync(x => x.Id == columnId && x.BoardId == boardId, ct);
        if (column is null) return NotFound();
        column.Name = request.Name.Trim();
        column.Position = request.Position;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{columnId:guid}")]
    public async Task<IActionResult> Delete(Guid boardId, Guid columnId, CancellationToken ct)
    {
        if (!await access.CanEditAsync(boardId, UserId, ct)) return Forbid();
        var column = await db.Columns.Include(x => x.Tasks)
            .FirstOrDefaultAsync(x => x.Id == columnId && x.BoardId == boardId, ct);
        if (column is null) return NotFound();
        if (column.Tasks.Count > 0)
            return Conflict(new { message = "Move or delete tasks before deleting this column." });
        db.Columns.Remove(column);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
