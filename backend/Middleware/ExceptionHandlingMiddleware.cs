using System.Net;
using System.Text.Json;

namespace HealthBridge.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred during request execution.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            InvalidOperationException invalidOpEx => ((int)HttpStatusCode.Conflict, invalidOpEx.Message),
            KeyNotFoundException keyNotFoundEx => ((int)HttpStatusCode.NotFound, keyNotFoundEx.Message),
            ArgumentException argEx => ((int)HttpStatusCode.BadRequest, argEx.Message),
            UnauthorizedAccessException unauthEx => ((int)HttpStatusCode.Unauthorized, unauthEx.Message),
            _ => ((int)HttpStatusCode.InternalServerError, "An unexpected error occurred. Please try again later.")
        };

        context.Response.StatusCode = statusCode;

        var response = new
        {
            status = statusCode,
            message = message,
            detail = _env.IsDevelopment() && statusCode == (int)HttpStatusCode.InternalServerError
                ? exception.Message
                : null
        };

        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}
