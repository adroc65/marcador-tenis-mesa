# Servidor estático mínimo para probar la PWA.
# Uso: powershell -ExecutionPolicy Bypass -File serve.ps1 [puerto]
param([int]$Port = 8200)

$root = $PSScriptRoot
$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.json' = 'application/json'
  '.webmanifest' = 'application/manifest+json'
  '.png'  = 'image/png'
  '.svg'  = 'image/svg+xml'
  '.ico'  = 'image/x-icon'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try {
  # Para acceder desde el teléfono/tablet en la misma red hace falta
  # permiso de admin para escuchar en todas las interfaces; si no se
  # puede, queda solo en localhost.
  $listener.Prefixes.Add("http://+:$Port/")
  $listener.Start()
} catch {
  $listener = New-Object System.Net.HttpListener
  $listener.Prefixes.Add("http://localhost:$Port/")
  try {
    $listener.Start()
  } catch {
    Write-Host "ERROR: no se pudo usar el puerto $Port. ¿Ya hay otro servidor corriendo? Ciérralo o usa otro puerto: .\serve.ps1 8201"
    exit 1
  }
}

Write-Host "Sirviendo $root en http://localhost:$Port/  (Ctrl+C para detener)"

try {
while ($listener.IsListening) {
  # Espera conexiones en tramos cortos para que Ctrl+C pueda interrumpir
  $async = $listener.GetContextAsync()
  while (-not $async.AsyncWaitHandle.WaitOne(250)) { }
  $ctx = $async.GetAwaiter().GetResult()
  # Un error atendiendo una petición no debe tumbar el servidor
  try {
    $path = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($path -eq '/') { $path = '/index.html' }
    $file = Join-Path $root ($path -replace '/', '\')
    $resolved = $null
    try { $resolved = (Resolve-Path $file -ErrorAction Stop).Path } catch {}
    if ($resolved -and $resolved.StartsWith($root) -and (Test-Path $resolved -PathType Leaf)) {
      $bytes = [IO.File]::ReadAllBytes($resolved)
      $ext = [IO.Path]::GetExtension($resolved).ToLower()
      if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
      $ctx.Response.Headers.Add('Cache-Control', 'no-cache')
      $ctx.Response.ContentLength64 = $bytes.Length
      # Las peticiones HEAD solo piden encabezados, sin contenido
      if ($ctx.Request.HttpMethod -ne 'HEAD') {
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
    } else {
      $ctx.Response.StatusCode = 404
    }
    $ctx.Response.Close()
  } catch {
    try { $ctx.Response.Close() } catch {}
  }
}
} finally {
  $listener.Stop()
  $listener.Close()
  Write-Host "Servidor detenido."
}
