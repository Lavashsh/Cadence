using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cadence.Application.Contracts;
using Cadence.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Cadence.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(
    UserManager<AppUser> users,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request)
    {
        var user = new AppUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email.Trim().ToLowerInvariant(),
            Email = request.Email.Trim().ToLowerInvariant(),
            CreatedAt = DateTimeOffset.UtcNow
        };

        var result = await users.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(x => new { x.Code, x.Description }) });

        return CreatedAtAction(nameof(Me), new { }, new
        {
            user.Id, user.Email, user.CreatedAt
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await users.FindByEmailAsync(request.Email.Trim());
        if (user is null || !await users.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { message = "Invalid email or password." });

        var token = CreateToken(user);
        return Ok(new
        {
            accessToken = token,
            tokenType = "Bearer",
            expiresAt = DateTimeOffset.UtcNow.AddMinutes(
                configuration.GetValue<int>("Jwt:ExpiresMinutes", 60)),
            user = new { user.Id, user.Email }
        });
    }

    [HttpGet("me"), Microsoft.AspNetCore.Authorization.Authorize]
    public IActionResult Me() => Ok(new
    {
        Id = User.FindFirstValue(ClaimTypes.NameIdentifier),
        Email = User.FindFirstValue(ClaimTypes.Email)
    });

    private string CreateToken(AppUser user)
    {
        var key = configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT key is not configured.");
        var expires = DateTime.UtcNow.AddMinutes(configuration.GetValue<int>("Jwt:ExpiresMinutes", 60));
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            configuration["Jwt:Issuer"], configuration["Jwt:Audience"],
            claims, expires: expires, signingCredentials: credentials);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
