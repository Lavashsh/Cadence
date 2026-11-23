using System.Security.Claims;
using Cadence.Domain.Entities;
using Cadence.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Cadence.Api.Hubs;

[Authorize]
public sealed class BoardHub(BoardAccessService access) : Hub
{
    public async Task JoinBoard(Guid boardId)
    {
        var userId = GetUserId();
        if (!await access.CanReadAsync(boardId, userId, Context.ConnectionAborted))
        {
            throw new HubException("Access denied.");
        }
        await Groups.AddToGroupAsync(Context.ConnectionId, boardId.ToString());
        await Clients.Group(boardId.ToString()).SendAsync("UserJoined", userId, Context.ConnectionId);
    }

    public async Task LeaveBoard(Guid boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, boardId.ToString());
        await Clients.Group(boardId.ToString()).SendAsync("UserLeft", GetUserId(), Context.ConnectionId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await base.OnDisconnectedAsync(exception);
    }

    private Guid GetUserId()
    {
        var id = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");
        if (id is null || !Guid.TryParse(id, out var guid))
        {
            throw new HubException("Unauthorized.");
        }
        return guid;
    }
}