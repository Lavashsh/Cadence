using Cadence.Domain.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Cadence.Infrastructure.Persistence;

public sealed class CadenceDbContext(DbContextOptions<CadenceDbContext> options)
    : IdentityDbContext<AppUser, Microsoft.AspNetCore.Identity.IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Board> Boards => Set<Board>();
    public DbSet<BoardMember> BoardMembers => Set<BoardMember>();
    public DbSet<BoardColumn> Columns => Set<BoardColumn>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Board>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(120).IsRequired();
            e.Property(x => x.Description).HasMaxLength(1000);
            e.HasOne(x => x.Owner).WithMany(x => x.OwnedBoards)
                .HasForeignKey(x => x.OwnerId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(x => x.OwnerId);
        });

        builder.Entity<BoardMember>(e =>
        {
            e.HasKey(x => new { x.BoardId, x.UserId });
            e.HasOne(x => x.Board).WithMany(x => x.Members).HasForeignKey(x => x.BoardId);
            e.HasOne(x => x.User).WithMany(x => x.BoardMemberships).HasForeignKey(x => x.UserId);
            e.HasIndex(x => x.UserId);
        });

        builder.Entity<BoardColumn>(e =>
        {
            e.Property(x => x.Name).HasMaxLength(80).IsRequired();
            e.HasIndex(x => new { x.BoardId, x.Position });
            e.HasOne(x => x.Board).WithMany(x => x.Columns).HasForeignKey(x => x.BoardId);
        });

        builder.Entity<TaskItem>(e =>
        {
            e.Property(x => x.Title).HasMaxLength(200).IsRequired();
            e.Property(x => x.Description).HasMaxLength(5000);
            e.HasIndex(x => new { x.BoardId, x.ColumnId, x.Position });
            e.HasIndex(x => x.DueDate);
            e.HasOne(x => x.Column).WithMany(x => x.Tasks).HasForeignKey(x => x.ColumnId);
            e.HasOne(x => x.Assignee).WithMany().HasForeignKey(x => x.AssigneeId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }
}
