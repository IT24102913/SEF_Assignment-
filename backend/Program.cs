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

// 1. Configure Database (PostgreSQL EF Core)
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

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
var jwtSettings = jwtSettingsSection.Get<JwtSettings>()
    ?? throw new InvalidOperationException("JwtSettings section is missing in configuration.");

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
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAppointmentService, AppointmentService>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Appointments.DoctorRecommendationAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.PrescriptionSafetyAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.InventoryForecastingAgent>();
builder.Services.AddHttpClient("GeminiClient");

// ✅ Register EMR Service
builder.Services.AddScoped<HealthBridge.Api.Services.EMR.IEMRService, HealthBridge.Api.Services.EMR.EMRService>();

// ✅ Register Lab Management Multi-Agent System (2 Distinct Agents + Orchestrator)
builder.Services.AddScoped<HealthBridge.Api.Agents.Lab.PrescriptionVerificationAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Lab.LabQueueAndSafetyAgent>();
builder.Services.AddScoped<HealthBridge.Api.Agents.Lab.LabAgentOrchestrator>();

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

// Seed Database (Development Only)
if (app.Environment.IsDevelopment())
{
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
            logger.LogError(ex, "An error occurred while seeding the database.");
        }
    }
}

// 7. Middleware Pipeline
app.UseCors("DefaultCorsPolicy");
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
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

app.Run();

public class SuppressAntiforgeryFeature : Microsoft.AspNetCore.Antiforgery.IAntiforgeryValidationFeature
{
    public bool IsValid => true;
    public Exception? Error => null;
}