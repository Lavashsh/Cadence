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
[Route("api/boards")]
public sealed class BoardsController(CadenceDbContext db, BoardAccessService access) : ControllerBase
{
    private Guid UserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken ct)
    {
        var boards = await db.Boards.AsNoTracking()
            .Where(b => b.Members.Any(m => m.UserId == UserId))
            .OrderByDescending(b => b.UpdatedAt)
            .Select(b => new { b.Id, b.Name, b.Description, b.OwnerId, b.CreatedAt, b.UpdatedAt })
            .ToListAsync(ct);
        return Ok(boards);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateBoardRequest request, CancellationToken ct)
    {
        var board = new Board
        {
            Name = request.Name.Trim(),
            Description = request.Description,
            OwnerId = UserId
        };
        board.Members.Add(new BoardMember { BoardId = board.Id, UserId = UserId, Role = BoardRole.Owner });
        board.Columns.Add(new BoardColumn { BoardId = board.Id, Name = "To do", Position = 0 });
        board.Columns.Add(new BoardColumn { BoardId = board.Id, Name = "In progress", Position = 1 });
        board.Columns.Add(new BoardColumn { BoardId = board.Id, Name = "Done", Position = 2 });

        db.Boards.Add(board);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(GetById), new { boardId = board.Id }, new { board.Id, board.Name });
    }

    [HttpGet("{boardId:guid}")]
    public async Task<IActionResult> GetById(Guid boardId, CancellationToken ct)
    {
        if (!await access.CanReadAsync(boardId, UserId, ct)) return NotFound();
        var board = await db.Boards.AsNoTracking()
            .Where(x => x.Id == boardId)
            .Select(x => new
            {
                x.Id, x.Name, x.Description, x.OwnerId, x.CreatedAt, x.UpdatedAt,
                Columns = x.Columns.OrderBy(c => c.Position).Select(c => new
                {
                    c.Id, c.Name, c.Position,
                    Tasks = c.Tasks.OrderBy(t => t.Position).Select(t => new
                    {
                        t.Id, t.Title, t.Description, t.AssigneeId, t.DueDate,
                        t.Position, t.CreatedAt, t.UpdatedAt
                    })
                }),
                Members = x.Members.Select(m => new { m.UserId, m.Role })
            }).FirstOrDefaultAsync(ct);
        return board is null ? NotFound() : Ok(board);
    }

    [HttpPut("{boardId:guid}")]
    public async Task<IActionResult> Update(Guid boardId, UpdateBoardRequest request, CancellationToken ct)
    {
        if (!await access.IsOwnerAsync(boardId, UserId, ct)) return Forbid();
        var board = await db.Boards.FindAsync([boardId], ct);
        if (board is null) return NotFound();
        board.Name = request.Name.Trim();
        board.Description = request.Description;
        board.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{boardId:guid}")]
    public async Task<IActionResult> Delete(Guid boardId, CancellationToken ct)
    {
        if (!await access.IsOwnerAsync(boardId, UserId, ct)) return Forbid();
        var board = await db.Boards.FindAsync([boardId], ct);
        if (board is null) return NotFound();
        db.Boards.Remove(board);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPost("{boardId:guid}/members")]
    public async Task<IActionResult> AddMember(Guid boardId, AddMemberRequest request, CancellationToken ct)
    {
        if (!await access.IsOwnerAsync(boardId, UserId, ct)) return Forbid();
        if (!await db.Boards.AnyAsync(x => x.Id == boardId, ct)) return NotFound();
        if (request.UserId == UserId)
            return BadRequest(new { message = "The board owner role cannot be changed." });
        if (!await db.Users.AnyAsync(x => x.Id == request.UserId, ct))
            return BadRequest(new { message = "User does not exist." });
        if (!Enum.TryParse<BoardRole>(request.Role, true, out var role) || role == BoardRole.Owner)
            return BadRequest(new { message = "Role must be Editor or Viewer." });

        var member = await db.BoardMembers.FindAsync([boardId, request.UserId], ct);
        if (member is null)
            db.BoardMembers.Add(new BoardMember { BoardId = boardId, UserId = request.UserId, Role = role });
        else
            member.Role = role;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{boardId:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid boardId, Guid memberId, CancellationToken ct)
    {
        if (!await access.IsOwnerAsync(boardId, UserId, ct)) return Forbid();
        if (memberId == UserId) return BadRequest(new { message = "Owner cannot remove themselves." });
        var member = await db.BoardMembers.FindAsync([boardId, memberId], ct);
        if (member is null) return NotFound();
        db.BoardMembers.Remove(member);
        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}
