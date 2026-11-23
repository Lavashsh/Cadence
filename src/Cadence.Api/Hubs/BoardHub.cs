using System.Security.Claims;
using System.Collections.Concurrent;
using Cadence.Domain.Entities;
using Cadence.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Cadence.Api.Hubs;

[Authorize]
public sealed class BoardHub(BoardAccessService access) : Hub
{
    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, byte>> JoinedBoards = new();
    private static readonly ConcurrentDictionary<(string BoardId, string UserId), ConcurrentDictionary<string, byte>> BoardConnections = new();

    public async Task JoinBoard(Guid boardId)
    {
        var userId = GetUserId();
        if (!await access.CanReadAsync(boardId, userId, Context.ConnectionAborted))
        {
            throw new HubException("Access denied.");
        }
        var group = boardId.ToString();
        var joined = JoinedBoards.GetOrAdd(Context.ConnectionId, _ => new());
        if (joined.TryAdd(group, 0))
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, group);
            TrackConnection(group, userId, Context.ConnectionId);
            await Clients.Group(group).SendAsync("UserJoined", userId, Context.ConnectionId);
        }
    }

    public async Task LeaveBoard(Guid boardId)
    {
        var group = boardId.ToString();
        if (JoinedBoards.TryGetValue(Context.ConnectionId, out var joined) && joined.TryRemove(group, out _))
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, group);
            UntrackConnection(group, GetUserId(), Context.ConnectionId);
            await Clients.Group(group).SendAsync("UserLeft", GetUserId(), Context.ConnectionId);
            if (joined.IsEmpty) JoinedBoards.TryRemove(Context.ConnectionId, out _);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (JoinedBoards.TryRemove(Context.ConnectionId, out var joined))
        {
            var userId = GetUserId();
            foreach (var group in joined.Keys)
            {
                UntrackConnection(group, userId, Context.ConnectionId);
                await Clients.Group(group).SendAsync("UserLeft", userId, Context.ConnectionId);
            }
        }
        await base.OnDisconnectedAsync(exception);
    }

    public static async Task RevokeBoardAccessAsync(
        IHubContext<BoardHub> hub, Guid boardId, Guid userId, CancellationToken cancellationToken)
    {
        var group = boardId.ToString();
        var key = (group, userId.ToString());
        if (!BoardConnections.TryRemove(key, out var connections)) return;

        foreach (var connectionId in connections.Keys)
        {
            await hub.Groups.RemoveFromGroupAsync(connectionId, group, cancellationToken);
            if (JoinedBoards.TryGetValue(connectionId, out var joined))
            {
                joined.TryRemove(group, out _);
                if (joined.IsEmpty) JoinedBoards.TryRemove(connectionId, out _);
            }
            await hub.Clients.Client(connectionId).SendAsync("MemberRemoved", userId, cancellationToken);
            await hub.Clients.Group(group).SendAsync("UserLeft", userId, connectionId, cancellationToken);
        }
    }

    private static void TrackConnection(string boardId, Guid userId, string connectionId) =>
        BoardConnections.GetOrAdd((boardId, userId.ToString()), _ => new())
            .TryAdd(connectionId, 0);

    private static void UntrackConnection(string boardId, Guid userId, string connectionId)
    {
        var key = (boardId, userId.ToString());
        if (BoardConnections.TryGetValue(key, out var connections))
        {
            connections.TryRemove(connectionId, out _);
            if (connections.IsEmpty) BoardConnections.TryRemove(key, out _);
        }
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
