using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System;
using System.IO;
using System.Threading.Tasks;

namespace HealthBridge.Api.Controllers;

[ApiController]
[Route("api/uploads")]
[IgnoreAntiforgeryToken]
public class UploadsController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly IConfiguration _config;

    public UploadsController(IWebHostEnvironment env, IConfiguration config)
    {
        _env = env;
        _config = config;
    }

    [HttpPost]
    public async Task<IActionResult> UploadFile(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded." });

        var uploadsFolder = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        if (!Directory.Exists(uploadsFolder))
            Directory.CreateDirectory(uploadsFolder);

        var extension = Path.GetExtension(file.FileName).ToLower();
        var uniqueFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var fileStream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(fileStream);
        }

        var publicBase = _config["PublicBaseUrl"]?.TrimEnd('/');
        if (string.IsNullOrWhiteSpace(publicBase))
        {
            var hostStr = Request.Host.Value;
            if (hostStr.Contains("localhost", StringComparison.OrdinalIgnoreCase) || hostStr.Contains("127.0.0.1"))
            {
                var localIp = GetLocalIpAddress();
                publicBase = $"{Request.Scheme}://{localIp}:5126";
            }
            else
            {
                publicBase = $"{Request.Scheme}://{Request.Host}";
            }
        }

        var fullUrl = $"{publicBase}/uploads/{uniqueFileName}";
        return Ok(new { fileUrl = fullUrl, relativePath = $"/uploads/{uniqueFileName}" });
    }

    private static string GetLocalIpAddress()
    {
        try
        {
            using var socket = new System.Net.Sockets.Socket(
                System.Net.Sockets.AddressFamily.InterNetwork, 
                System.Net.Sockets.SocketType.Dgram, 0);
            socket.Connect("8.8.8.8", 65530);
            var endPoint = socket.LocalEndPoint as System.Net.IPEndPoint;
            if (endPoint != null)
            {
                return endPoint.Address.ToString();
            }
        }
        catch
        {
        }
        return "192.168.1.5";
    }
}
