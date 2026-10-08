using System.Text;
using System.Text.Json;  
using System.Text.Json.Serialization;// ← THIS IS THE MISSING LINE
using HealthBridge.Api.Authentication;
using HealthBridge.Api.Data;
using HealthBridge.Api.Middleware;
using HealthBridge.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// Railway dynamic PORT binding (defaults to standard ports locally)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrEmpty(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// 1. Configure Database (PostgreSQL EF Core)
// Supports Railway DATABASE_URL / DATABASE_PUBLIC_URL as well as local DefaultConnection
var rawConnectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
    ?? Environment.GetEnvironmentVariable("DATABASE_PUBLIC_URL")
    ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection")
    ?? builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' or 'DATABASE_URL' not found. In Railway, ensure DATABASE_URL is set in Variables.");

var connectionString = ProgramHelper.ParsePostgreSqlConnectionString(rawConnectionString);

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorCodesToAdd: null);
    }));

// 2. Configure JWT Settings & Authentication
var jwtSettingsSection = builder.Configuration.GetSection(JwtSettings.SectionName);
builder.Services.Configure<JwtSettings>(jwtSettingsSection);
var jwtSettings = jwtSettingsSection.Get<JwtSettings>() ?? new JwtSettings
{
    Secret = Environment.GetEnvironmentVariable("JwtSettings__Secret") ?? "SuperSecretHealthBridgeJwtKey_MustBeAtLeast32BytesLongForHmacSha256Security!",
    Issuer = Environment.GetEnvironmentVariable("JwtSettings__Issuer") ?? "HealthBridgeApi",
    Audience = Environment.GetEnvironmentVariable("JwtSettings__Audience") ?? "HealthBridgeClients",
    ExpiryInMinutes = 1440
};

if (jwtSettings.Secret.Length < 32)
{
    throw new InvalidOperationException("JWT Secret must be at least 32 characters long.");
}

var key = Encoding.UTF8.GetBytes(jwtSettings.Secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role,
        NameClaimType = System.Security.Claims.ClaimTypes.NameIdentifier
    };
});

builder.Services.AddAuthorization();

// 3. Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("DefaultCorsPolicy", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// 4. Register Application Services
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IMedicineService, MedicineService>();
builder.Services.AddScoped<IPatientService, PatientService>();
builder.Services.AddScoped<IPrescriptionService, PrescriptionService>();
builder.Services.AddScoped<IPharmacyOrderService, PharmacyOrderService>();
builder.Services.Configure<SmtpSettings>(builder.Configuration.GetSection(SmtpSettings.SectionName));
builder.Services.AddScoped<IEmailSender, EmailSender>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IDoctorEmailService, DoctorEmailService>();
builder.Services.AddScoped<IPharmacyEmailService, PharmacyEmailService>();
// ✅ Register Doctor Recommendation Multi-Agent System (Coordinator, Safety, Triage, and Allow-Listed Tool)
builder.Services.AddScoped<HealthBridge.Api.Agents.Appointments.IClinicalSafetyAgent, HealthBridge.Api.Agents.Appointments.ClinicalSafetyAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Appointments.IClinicalTriageAgent, HealthBridge.Api.Agents.Appointments.ClinicalTriageAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Appointments.IDoctorSlotAllocationTool, HealthBridge.Api.Agents.Appointments.DoctorSlotAllocationTool>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Appointments.DoctorRecommendationAgent>();
// ✅ Register Vision AI Agents — PrescriptionValidatorAgent MUST be registered BEFORE PrescriptionSafetyAgent
// so it is correctly injected into PrescriptionSafetyAgent's constructor (not resolved as null)
builder.Services.AddScoped<HealthBridge.Api.Agents.PrescriptionValidatorAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.QwenVisionAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.PrescriptionSafetyAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.InventoryForecastingAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Pharmacy.SymptomAdviceAgent>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("GeminiClient");

// ✅ Register EMR Service
builder.Services.AddScoped<HealthBridge.Api.Services.EMR.IEMRService, HealthBridge.Api.Services.EMR.EMRService>();

// ✅ Register Patient Analytics Service
builder.Services.AddScoped<IPatientAnalyticsService, PatientAnalyticsService>();

// ✅ Register Lab Management Multi-Agent System (2 Distinct Agents + Orchestrator)
builder.Services.AddScoped<HealthBridge.Api.Agents.Lab.PrescriptionVerificationAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Lab.LabQueueAndSafetyAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Lab.LabAgentOrchestrator>();

// ✅ Register EMR Agentic AI — Clinical Insight Agent (uses Gemini API for medical analysis)
builder.Services.AddScoped<HealthBridge.Api.Agents.EMR.EMRClinicalInsightAgent>();

// 5. Add Controllers and DISABLE Antiforgery
builder.Services.AddControllers(options =>
{
    options.Filters.Add(new Microsoft.AspNetCore.Mvc.IgnoreAntiforgeryTokenAttribute());
})
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowReadingFromString;
});

// 6. Configure Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Health Bridge (Pvt) Ltd - Healthcare API",
        Version = "v1",
        Description = "ASP.NET Core Web API backend for Health Bridge Medicare Management System."
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter your valid JWT token in the text input below."
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// Seed and Migrate Database (Runs automatically in Dev and on Cloud/Railway)
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    try
    {
        await DbInitializer.SeedAsync(context);
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding / migrating the database.");
    }
}

// 7. Middleware Pipeline
app.UseCors("DefaultCorsPolicy");
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Enable Swagger in Development or if ENABLE_SWAGGER is set / enabled in config
if (app.Environment.IsDevelopment() ||
    string.Equals(Environment.GetEnvironmentVariable("ENABLE_SWAGGER"), "true", StringComparison.OrdinalIgnoreCase) ||
    app.Configuration.GetValue<bool>("EnableSwagger", true))
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Health Bridge API v1");
        c.RoutePrefix = "swagger";
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
if (!Directory.Exists(uploadsPath))
{
    Directory.CreateDirectory(uploadsPath);
}
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});
app.UseStaticFiles();

// Suppress Antiforgery validation feature for API controllers
app.Use(async (context, next) =>
{
    context.Features.Set<Microsoft.AspNetCore.Antiforgery.IAntiforgeryValidationFeature>(
        new SuppressAntiforgeryFeature());
    await next();
});

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Auto-ensure DB schema updates & index creation
try
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    db.Database.ExecuteSqlRaw(@"ALTER TABLE ""DoctorAppointments"" ADD COLUMN IF NOT EXISTS ""CheckedInByUserId"" integer NULL;");
    db.Database.ExecuteSqlRaw(@"ALTER TABLE ""DoctorAppointments"" ADD COLUMN IF NOT EXISTS ""StatusChangeReason"" text NULL;");
    db.Database.ExecuteSqlRaw(@"ALTER TABLE ""DoctorAppointments"" ADD COLUMN IF NOT EXISTS ""ReadyAlertSentAt"" timestamp with time zone NULL;");
    db.Database.ExecuteSqlRaw(@"ALTER TABLE ""DoctorSessions"" ADD COLUMN IF NOT EXISTS ""SessionType"" text NOT NULL DEFAULT 'Morning';");
    db.Database.ExecuteSqlRaw(@"UPDATE ""DoctorSessions"" SET ""SessionType"" = CASE WHEN ""SessionTime"" < '12:00:00' THEN 'Morning' WHEN ""SessionTime"" < '17:00:00' THEN 'Evening' ELSE 'Night' END WHERE ""SessionType"" = 'Morning' AND ""SessionTime"" >= '12:00:00';");
    db.Database.ExecuteSqlRaw(@"ALTER TABLE ""LabBookings"" ADD COLUMN IF NOT EXISTS ""IsSavedToEmr"" boolean NOT NULL DEFAULT FALSE;");
    db.Database.ExecuteSqlRaw(@"ALTER TABLE ""LabBookings"" ADD COLUMN IF NOT EXISTS ""EmrLabReportId"" uuid NULL;");
    db.Database.ExecuteSqlRaw(@"CREATE TABLE IF NOT EXISTS ""SymptomAdviceHistory"" (""Id"" integer GENERATED BY DEFAULT AS IDENTITY, ""PatientEmail"" text NULL, ""Symptom"" text NOT NULL, ""SymptomCategory"" text NOT NULL, ""Summary"" text NOT NULL, ""ResponseJson"" text NOT NULL, ""EngineUsed"" text NOT NULL, ""CreatedAt"" timestamp with time zone NOT NULL, CONSTRAINT ""PK_SymptomAdviceHistory"" PRIMARY KEY (""Id""));");

    if (db.Database.IsNpgsql())
    {
        var conn = db.Database.GetDbConnection();
        if (conn.State != System.Data.ConnectionState.Open)
        {
            conn.Open();
        }

        using var dupCmd = conn.CreateCommand();
        dupCmd.CommandText = @"
            SELECT ""DoctorSessionId"", ""QueueNumber"", COUNT(*) AS ""DupCount""
            FROM public.""DoctorAppointments""
            WHERE ""Status"" <> 'Cancelled'
            GROUP BY ""DoctorSessionId"", ""QueueNumber""
            HAVING COUNT(*) > 1;";

        var duplicateSessions = new List<string>();
        using (var reader = dupCmd.ExecuteReader())
        {
            while (reader.Read())
            {
                var sId = reader.GetInt32(0);
                var qNum = reader.GetInt32(1);
                var dCount = reader.GetInt64(2);
                duplicateSessions.Add($"Session {sId} (Queue #{qNum}, {dCount} rows)");
            }
        }

        if (duplicateSessions.Count > 0)
        {
            app.Logger.LogWarning("Duplicate active queue numbers detected among non-cancelled appointments: {Duplicates}. Skipping creation of unique index IX_DoctorAppointments_DoctorSessionId_QueueNumber.", string.Join("; ", duplicateSessions));
        }
        else
        {
            db.Database.ExecuteSqlRaw(@"CREATE UNIQUE INDEX IF NOT EXISTS ""IX_DoctorAppointments_DoctorSessionId_QueueNumber"" ON public.""DoctorAppointments"" (""DoctorSessionId"", ""QueueNumber"") WHERE ""Status"" <> 'Cancelled';");
        }
    }
}
catch (Exception ex)
{
    app.Logger.LogWarning(ex, "Could not run automatic schema migration or index creation.");
}

// Check email credentials at startup
var startupSmtpUser = builder.Configuration["SmtpSettings:SmtpUser"] ?? Environment.GetEnvironmentVariable("SmtpSettings__SmtpUser");
var startupSmtpPass = builder.Configuration["SmtpSettings:SmtpPass"] ?? Environment.GetEnvironmentVariable("SmtpSettings__SmtpPass");
var startupBrevoKey = builder.Configuration["Brevo:ApiKey"] ?? Environment.GetEnvironmentVariable("Brevo__ApiKey");
bool hasValidSmtpCreds = !string.IsNullOrWhiteSpace(startupSmtpUser) && !string.IsNullOrWhiteSpace(startupSmtpPass)
    && !startupSmtpUser.StartsWith("YOUR_") && !startupSmtpPass.StartsWith("YOUR_");
bool hasValidBrevoCreds = !string.IsNullOrWhiteSpace(startupBrevoKey) && !startupBrevoKey.StartsWith("YOUR_");

if (!hasValidSmtpCreds && !hasValidBrevoCreds)
{
    app.Logger.LogWarning("Email credentials are not configured, emails will not be sent");
}

// Health Check Endpoints (Public / Anonymous for Railway, graders, and uptime monitors)
app.MapGet("/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "Health Bridge Web API",
    timestamp = DateTime.UtcNow
})).AllowAnonymous();

app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "Health Bridge Web API",
    timestamp = DateTime.UtcNow
})).AllowAnonymous();

// Redirect root domain "/" straight to Swagger UI for convenient browser access
app.MapGet("/", () => Results.Redirect("/swagger/index.html")).AllowAnonymous();

app.Run();

public class SuppressAntiforgeryFeature : Microsoft.AspNetCore.Antiforgery.IAntiforgeryValidationFeature
{
    public bool IsValid => true;
    public Exception? Error => null;
}

public static partial class ProgramHelper
{
    /// <summary>
    /// Converts a Railway/Heroku PostgreSQL URI (postgres:// or postgresql://) to a standard Npgsql connection string.
    /// Returns the raw string unchanged if already in standard Npgsql key=value format.
    /// </summary>
    public static string ParsePostgreSqlConnectionString(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return raw;

        if (raw.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            raw.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var uri = new Uri(raw);
                var userInfo = uri.UserInfo.Split(':');
                var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : "";
                var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : "";
                var database = uri.AbsolutePath.TrimStart('/');
                var port = uri.Port > 0 ? uri.Port : 5432;

                return $"Host={uri.Host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Prefer;Trust Server Certificate=true;Timeout=30;Command Timeout=30;Keepalive=30;";
            }
            catch
            {
                return raw;
            }
        }

        return raw;
    }
}