param(
 [Parameter(Mandatory=$true)][string]$Root,
 [Parameter(Mandatory=$true)][string]$Run,
 [switch]$StopOnly
)
$ErrorActionPreference='Stop'
$exe=Join-Path $Root 'winamp-test\winamp.exe'
$profile=Join-Path $Run 'profile'
$sample=Join-Path $Run 'stereo-probe.wav'
if(!(Test-Path $exe) -or !(Test-Path "$profile\neowulf.ini") -or !(Test-Path $sample)){throw 'Verified isolated deployment required'}
Add-Type @'
using System; using System.Text; using System.Runtime.InteropServices;
public static class HellfireRestart {
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32")] public static extern bool EnumWindows(EnumProc cb,IntPtr p);
 [DllImport("user32")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder s,int n);
 [DllImport("user32",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32")] public static extern IntPtr GetDlgItem(IntPtr h,int id);
 [DllImport("user32")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
}
'@
$old=@(Get-Process winamp -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $exe})
if($old.Count -gt 1){throw 'Ambiguous isolated process; preserved'}
if($old.Count -eq 1){
 $script:main=[IntPtr]::Zero
 $cb=[HellfireRestart+EnumProc]{param($h,$unused)
  [uint32]$owner=0;[HellfireRestart]::GetWindowThreadProcessId($h,[ref]$owner)|Out-Null
  if($owner -eq $old[0].Id){
   $c=[Text.StringBuilder]::new(128);$t=[Text.StringBuilder]::new(256)
   [HellfireRestart]::GetClassName($h,$c,128)|Out-Null;[HellfireRestart]::GetWindowText($h,$t,256)|Out-Null
   if($c.ToString() -eq 'NEOWULF_TEST'){$script:main=$h}
   if($c.ToString() -eq '#32770' -and $t.ToString() -eq 'Add Media to Library'){
    [HellfireRestart]::PostMessage([HellfireRestart]::GetDlgItem($h,1),245,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null
   }
  };return $true
 }
 [HellfireRestart]::EnumWindows($cb,[IntPtr]::Zero)|Out-Null
 if(!$script:main.ToInt64()){throw 'Owned test class missing; process preserved'}
 Start-Sleep -Milliseconds 250
 [HellfireRestart]::PostMessage($script:main,16,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null
 if(!$old[0].WaitForExit(5000)){throw 'Graceful close deadline; process preserved'}
}
if($StopOnly){[pscustomobject]@{state='OWNED_TEST_CLOSED';pid=if($old.Count){$old[0].Id}else{$null}}|ConvertTo-Json -Compress;exit 0}
$arguments='/NEW /NOREG /CLASS=NEOWULF_TEST /CONFIG=neowulf.ini /INIDIR="'+$profile+'" /M3UDIR="'+$profile+'" "'+$sample+'"'
$started=Start-Process -FilePath $exe -ArgumentList $arguments -PassThru
$record=[pscustomobject]@{pid=$started.Id;startedUtc=$started.StartTime.ToUniversalTime().ToString('o');exe=$exe;arguments=$arguments;replacedPid=if($old.Count){$old[0].Id}else{$null}}
$record|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $Run 'launch.json') -Encoding UTF8
$record|ConvertTo-Json -Compress
