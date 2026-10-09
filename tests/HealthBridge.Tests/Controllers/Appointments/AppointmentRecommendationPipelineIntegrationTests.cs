using HealthBridge.Api.Data;
using HealthBridge.Api.DTOs.Appointments;
using HealthBridge.Api.Models;
using HealthBridge.Api.Models.Appointments;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Xunit;

namespace HealthBridge.Tests.Controllers.Appointments;

/// <summary>
/// End-to-end ASP.NET Core middleware pipeline tests using WebApplicationFactory.
/// Exercises the real [Authorize], [EnableRateLimiting], AuthenticationMiddleware,
/// and RateLimiterMiddleware pipeline.
/// </summary>
public class AppointmentRecommendationPipelineIntegrationTests : IClassFixture<AppointmentRecommendationPipelineIntegrationTests.TestWebApplicationFactory>
{
    private readonly TestWebApplicationFactory _factory;

    public AppointmentRecommendationPipelineIntegrationTests(TestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task RecommendDoctor_WhenAnonymous_Returns401Unauthorized()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/appointments/recommend-doctor", new DoctorRecommendationRequestDto
        {
            Symptoms = "persistent knee swelling and pain"
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task RecommendDoctor_WhenNonPatientRoleDoctor_Returns403Forbidden()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Doctor);
        client.DefaultRequestHeaders.Add("X-Test-UserId", "101");

        var response = await client.PostAsJsonAsync("/api/appointments/recommend-doctor", new DoctorRecommendationRequestDto
        {
            Symptoms = "persistent knee swelling and pain"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RecommendDoctor_WhenNonPatientRoleAdmin_Returns403Forbidden()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Admin);
        client.DefaultRequestHeaders.Add("X-Test-UserId", "1");

        var response = await client.PostAsJsonAsync("/api/appointments/recommend-doctor", new DoctorRecommendationRequestDto
        {
            Symptoms = "persistent knee swelling and pain"
        });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task RecommendDoctor_WhenPatientRole_Returns200Ok()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Patient);
        client.DefaultRequestHeaders.Add("X-Test-UserId", "42");

        var response = await client.PostAsJsonAsync("/api/appointments/recommend-doctor", new DoctorRecommendationRequestDto
        {
            Symptoms = "persistent knee swelling and pain"
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task RecommendDoctor_WhenEleventhRequestInOneMinute_Returns429TooManyRequests()
    {
        var client = _factory.CreateClient();
        // Specific user partition so rate limit applies strictly to this user
        var uniqueUserId = $"90{Guid.NewGuid().ToString("N")[..6]}";
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Patient);
        client.DefaultRequestHeaders.Add("X-Test-UserId", uniqueUserId);

        var requestBody = new DoctorRecommendationRequestDto
        {
            Symptoms = "persistent knee swelling and pain"
        };

        HttpResponseMessage? lastResponse = null;

        // Quota is 10 requests per minute
        for (int i = 1; i <= 10; i++)
        {
            lastResponse = await client.PostAsJsonAsync("/api/appointments/recommend-doctor", requestBody);
            Assert.Equal(HttpStatusCode.OK, lastResponse.StatusCode);
        }

        // 11th request MUST be rate limited to 429
        var burstResponse = await client.PostAsJsonAsync("/api/appointments/recommend-doctor", requestBody);
        Assert.Equal((HttpStatusCode)429, burstResponse.StatusCode);
    }

    // ─── Test WebApplicationFactory & In-Memory Auth ──────────────────────────

    public class TestWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseEnvironment("Testing");

            builder.ConfigureServices(services =>
            {
                // Remove existing DbContext registration (PostgreSQL) and replace with InMemory
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                var dbName = "IntegrationTestDb_" + Guid.NewGuid();
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase(dbName);
                });

                // Configure Test Authentication Scheme to intercept calls with X-Test-* headers
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "TestAuth";
                    options.DefaultChallengeScheme = "TestAuth";
                    options.DefaultScheme = "TestAuth";
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestAuth", _ => { });

                // Seed test data
                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var doc = new Doctor
                {
                    Id = 999,
                    FullName = "Dr. Integration Test Consultant",
                    Specialization = "Orthopaedics",
                    Hospital = "Health Bridge Colombo",
                    HospitalBranch = "Colombo",
                    IsAvailable = true,
                    IsVerifiedConsultant = true,
                    Rating = 5.0,
                    ExperienceYears = 20,
                    ConsultationFee = 3500m
                };
                db.Doctors.Add(doc);

                db.DoctorSessions.Add(new DoctorSession
                {
                    Id = 888,
                    DoctorId = doc.Id,
                    SessionDate = today.AddDays(1),
                    SessionTime = new TimeOnly(9, 0),
                    MaxCapacity = 20,
                    CurrentBookings = 0,
                    SessionStatus = SessionStatus.Scheduled
                });

                db.SaveChanges();
            });
        }
    }

    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder)
            : base(options, logger, encoder)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-Role", out var roleValues))
            {
                // Anonymous request
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            var role = roleValues.ToString();
            var userId = Request.Headers.TryGetValue("X-Test-UserId", out var uidValues)
                ? uidValues.ToString()
                : "100";

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId),
                new Claim(ClaimTypes.Role, role),
                new Claim(ClaimTypes.Name, $"TestUser_{userId}")
            };

            var identity = new ClaimsIdentity(claims, "TestAuth");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "TestAuth");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }
}
