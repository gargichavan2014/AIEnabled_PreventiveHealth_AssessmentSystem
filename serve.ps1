$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath($PSScriptRoot)
$rootPrefix = $root.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 4173)
$mimeTypes = @{
    ".css" = "text/css; charset=utf-8"
    ".html" = "text/html; charset=utf-8"
    ".ico" = "image/x-icon"
    ".js" = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg" = "image/svg+xml"
    ".webmanifest" = "application/manifest+json; charset=utf-8"
}

try {
    $listener.Start()
    Write-Host "Serving the installable demo at http://localhost:4173/"
    Write-Host "Keep this window open while installing. Press Ctrl+C to stop."

    while ($listener.Server.IsBound) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            while (($header = $reader.ReadLine()) -ne $null -and $header.Length -gt 0) {}

            $status = "200 OK"
            $body = [byte[]]@()
            $contentType = "text/plain; charset=utf-8"
            $parts = $requestLine -split " "

            if ($parts.Length -lt 2 -or $parts[0] -ne "GET") {
                $status = "405 Method Not Allowed"
                $body = [System.Text.Encoding]::UTF8.GetBytes("GET only")
            } else {
                $relativePath = [Uri]::UnescapeDataString($parts[1].Split("?")[0]).TrimStart("/")
                if ([string]::IsNullOrWhiteSpace($relativePath)) { $relativePath = "index.html" }
                $filePath = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($root, $relativePath.Replace("/", [System.IO.Path]::DirectorySeparatorChar)))

                if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or -not [System.IO.File]::Exists($filePath)) {
                    $status = "404 Not Found"
                    $body = [System.Text.Encoding]::UTF8.GetBytes("Not found")
                } else {
                    $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
                    if ($mimeTypes.ContainsKey($extension)) { $contentType = $mimeTypes[$extension] }
                    $body = [System.IO.File]::ReadAllBytes($filePath)
                }
            }

            $headerBytes = [System.Text.Encoding]::ASCII.GetBytes("HTTP/1.1 $status`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nX-Content-Type-Options: nosniff`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n")
            try {
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                if ($body.Length -gt 0) { $stream.Write($body, 0, $body.Length) }
                $stream.Flush()
            } catch [System.IO.IOException] {
                Write-Verbose "Client disconnected before the response finished."
            } finally {
                $reader.Dispose()
            }
        } finally {
            $client.Dispose()
        }
    }
} finally {
    $listener.Stop()
}
