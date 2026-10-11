# 秦皇岛麻将 一键无头回归
# 用法（在仓库根或 tests 目录均可）：
#   powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1            # 跑全部
#   powershell -ExecutionPolicy Bypass -File tests\run-tests.ps1 -Case rules
# 用例: rules(规则+番型配置+胡牌提示) / visual(34张全谱视觉) / reconn(断线重连+30秒托管+设置面板,需公网) / game(五局整局自走)
param([ValidateSet('rules','visual','reconn','game','all')][string]$Case='all')
$ErrorActionPreference='Stop'
$testsDir=Split-Path -Parent $MyInvocation.MyCommand.Path
$root=Split-Path -Parent $testsDir
$edge='C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
if(!(Test-Path $edge)){throw "未找到 Edge: $edge"}
$outDir=Join-Path $testsDir 'out'
New-Item -ItemType Directory -Force $outDir | Out-Null
$cfg=@{
 rules = @{time=20000;  size='1280,900'; kind='list';        extra=@(); real=$false}
 visual=@{time=8000;   size='1280,900'; kind='list';        extra=@(); real=$false}
 reconn=@{time=0;      size='1280,900'; kind='list';        extra=@('--allow-file-access-from-files'); real=$true}
 game  =@{time=600000; size='1280,800'; kind='regression';  extra=@(); real=$false}
}
if($Case -eq 'all'){$names=@('rules','visual','reconn','game')}else{$names=@($Case)}
$results=@()
foreach($n in $names){
 $c=$cfg[$n]
 Write-Host "==> [$n] 组装用例页面..." -ForegroundColor Cyan
 $html=[System.IO.File]::ReadAllText((Join-Path $root 'index.html'))
 $caseJs=[System.IO.File]::ReadAllText((Join-Path $testsDir "cases\$n.test.js"))
 $tmp=Join-Path $root ".qa-tmp-$n.html"
 [System.IO.File]::WriteAllText($tmp,$html.Replace('</body>',"<script>`n$caseJs`n</script></body>"),(New-Object System.Text.UTF8Encoding($false)))
 $png=Join-Path $outDir "$n.png"
 $domTxt=Join-Path $outDir "$n.dom.html"
 $udd=Join-Path $outDir ".edge-$n"
 $base=@('--headless=new','--disable-gpu','--no-first-run',"--user-data-dir=$udd","--window-size=$($c.size)")
 if(-not $c.real){$base+="--virtual-time-budget=$($c.time)"}
 $base+=$c.extra
 Write-Host "==> [$n] 截图..." -ForegroundColor Cyan
 Start-Process -FilePath $edge -ArgumentList ($base+@("--screenshot=$($png -replace '\\','/')","file:///$($tmp -replace '\\','/')")) -NoNewWindow -Wait | Out-Null
 Write-Host "==> [$n] 抓取报告 DOM..." -ForegroundColor Cyan
 Start-Process -FilePath $edge -ArgumentList ($base+@('--dump-dom',"file:///$($tmp -replace '\\','/')")) -NoNewWindow -Wait -RedirectStandardOutput $domTxt | Out-Null
 $dom=[System.IO.File]::ReadAllText($domTxt)
 $pass=0;$total=0;$fails=@();$ok=$false
 if($c.kind -eq 'list'){
  $fails=[regex]::Matches($dom,'<li class="f">([^<]+)</li>')|ForEach-Object{$_.Groups[1].Value}
  $m=[regex]::Match($dom,'<div>(\d+)/(\d+)\s*PASS</div>')
  if($m.Success){$pass=[int]$m.Groups[1].Value;$total=[int]$m.Groups[2].Value;$ok=($pass -eq $total)}
 }else{
  $q=[regex]::Match($dom,'id="qa2"[^>]*>([^<]*)')
  $txt=$q.Groups[1].Value
  $ok=$txt -match 'PASS 5-round regression' -and $txt -notmatch 'JSerrors:(?!none)'
  if($txt){$txt -split "`n"|ForEach-Object{Write-Host "    $_" -ForegroundColor Gray}}
 }
 Remove-Item $tmp -Force -ErrorAction SilentlyContinue
 if($ok){Write-Host ("PASS [{0}] {1}/{2}" -f $n,$pass,$total) -ForegroundColor Green}
 else{Write-Host ("FAIL [{0}] {1}/{2}" -f $n,$pass,$total) -ForegroundColor Red;$fails|ForEach-Object{Write-Host "  ✗ $_" -ForegroundColor Red}}
 $results+=[pscustomobject]@{Case=$n;OK=$ok;Pass=$pass;Total=$total;Shot=$png}
}
Write-Host "`n========== 汇总 ==========" -ForegroundColor Yellow
$results|Format-Table Case,OK,Pass,Total -AutoSize|Out-String|Write-Host
Write-Host "截图与报告: $outDir"
if(($results|Where-Object{-not $_.OK}).Count -gt 0){exit 1}else{exit 0}
