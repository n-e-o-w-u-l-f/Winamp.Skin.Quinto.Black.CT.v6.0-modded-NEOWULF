param(
  [Parameter(Mandatory=$true)][string]$Root,
  [Parameter(Mandatory=$true)][string]$Output,
  [switch]$OpenDecks,
  [switch]$ShowOwnedDecks,
  [switch]$DismissStartup,
  [switch]$Play,
  [switch]$MainOnly,
  [switch]$MotionROI,
  [string]$Sample,
  [int]$Frames=1,
  [ValidateSet('PrintWindow','Screen')][string]$CaptureMode='Screen'
)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing.dll,System.dll,System.Core.dll @'
using System; using System.Text; using System.Runtime.InteropServices;
using System.Collections.Generic; using System.Diagnostics; using System.Drawing; using System.Threading;
public static class HellfireProbe {
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32")] public static extern bool EnumWindows(EnumProc cb,IntPtr p);
 [DllImport("user32",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32",CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h,StringBuilder s,int n);
 [DllImport("user32")] public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);
 [DllImport("user32")] public static extern IntPtr GetDlgItem(IntPtr h,int id);
 [DllImport("user32",EntryPoint="GetWindowLongW")] public static extern int GetWindowLong(IntPtr h,int index);
 [DllImport("user32")] public static extern IntPtr WindowFromPoint(POINT p);
 [DllImport("user32")] public static extern IntPtr GetAncestor(IntPtr h,uint flags);
 public struct POINT {public int x,y;}
 [DllImport("user32")] public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
 [DllImport("user32")] public static extern bool ShowWindow(IntPtr h,int cmd);
 [DllImport("user32")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32")] public static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);
 [DllImport("user32")] public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);
 [DllImport("user32")] public static extern IntPtr SendMessageTimeout(IntPtr h,uint m,IntPtr w,IntPtr l,uint f,uint timeout,out IntPtr result);
 [StructLayout(LayoutKind.Sequential)] public struct COPYDATA {public IntPtr type;public int bytes;public IntPtr data;}
 [DllImport("user32",EntryPoint="SendMessageTimeoutW")] public static extern IntPtr SendCopy(IntPtr h,uint m,IntPtr w,ref COPYDATA data,uint f,uint timeout,out IntPtr result);
 public static bool Enqueue(IntPtr h,string path){
  IntPtr data=Marshal.StringToHGlobalUni(path),result;
  try{var c=new COPYDATA{type=(IntPtr)1100,bytes=(path.Length+1)*2,data=data};return SendCopy(h,74,IntPtr.Zero,ref c,2,2000,out result)!=IntPtr.Zero;}
  finally{Marshal.FreeHGlobal(data);}
 }
 [DllImport("user32")] public static extern int GetMenuItemCount(IntPtr h);
 [DllImport("user32")] public static extern IntPtr GetSubMenu(IntPtr h,int i);
 [DllImport("user32")] public static extern uint GetMenuItemID(IntPtr h,int i);
 [DllImport("user32")] public static extern uint GetMenuState(IntPtr h,uint i,uint flags);
 [DllImport("user32",CharSet=CharSet.Unicode)] public static extern int GetMenuString(IntPtr h,uint i,StringBuilder s,int n,uint f);
 public struct RECT {public int l,t,r,b;}
 public class Frame {public Bitmap bitmap;public string name;public double elapsedMs;public object playing;}
 public static List<Frame> SampleLabel(IntPtr h,int x,int y,int count) {
  var frames=new List<Frame>();var clock=Stopwatch.StartNew();
  try {for(int i=0;i<count;i++) {
   var center=new POINT{x=x+60,y=y+23};
   if(GetAncestor(WindowFromPoint(center),2)!=h)throw new InvalidOperationException("Owned label was occluded; sample rejected");
   var b=new Bitmap(120,46);
   try {using(var g=Graphics.FromImage(b))g.CopyFromScreen(x,y,0,0,new Size(120,46));}
   catch {b.Dispose();throw;}
   frames.Add(new Frame{bitmap=b,name="label_"+i.ToString("000")+".png",elapsedMs=clock.Elapsed.TotalMilliseconds});
   Thread.Sleep(10);
  }return frames;}catch {foreach(var f in frames)f.bitmap.Dispose();throw;}
 }
}
'@
$expected=Join-Path $Root 'winamp-test\winamp.exe'
$p=Get-Process winamp -ErrorAction SilentlyContinue | Where-Object {$_.Path -eq $expected}
if(@($p).Count -ne 1){throw 'Require exactly one isolated Winamp process'}
New-Item -ItemType Directory -Path $Output -Force | Out-Null
$ids=@($p.Id)
function Windows {
 $script:windows=[Collections.Generic.List[object]]::new()
 $cb=[HellfireProbe+EnumProc]{param($h,$unused)
  [uint32]$owner=0;[HellfireProbe]::GetWindowThreadProcessId($h,[ref]$owner)|Out-Null
  if($ids -contains $owner){
   $text=[Text.StringBuilder]::new(512);$class=[Text.StringBuilder]::new(128)
   [HellfireProbe]::GetWindowText($h,$text,512)|Out-Null
   [HellfireProbe]::GetClassName($h,$class,128)|Out-Null
   $r=[HellfireProbe+RECT]::new();[HellfireProbe]::GetWindowRect($h,[ref]$r)|Out-Null
   $script:windows.Add([pscustomobject]@{handle=$h.ToInt64();pid=$owner;title=$text.ToString();class=$class.ToString();visible=[HellfireProbe]::IsWindowVisible($h);x=$r.l;y=$r.t;w=$r.r-$r.l;h=$r.b-$r.t})
  };return $true
 }
 [HellfireProbe]::EnumWindows($cb,[IntPtr]::Zero)|Out-Null
}
Windows
$main=$script:windows | Where-Object {$_.class -eq 'NEOWULF_TEST'} | Select-Object -First 1
if(!$main){throw 'Expected isolated native window class absent'}
function Ipc([int]$param,[int]$message){
 $value=[IntPtr]::Zero
 $ok=[HellfireProbe]::SendMessageTimeout([IntPtr]$main.handle,1024,[IntPtr]$param,[IntPtr]$message,2,2000,[ref]$value)
 if($ok.ToInt64() -eq 0){throw "Native IPC deadline: $message"};return $value
}
# Starting the process does not mean that the Modern UI has finished loading.
$ready=[Diagnostics.Stopwatch]::StartNew();$readyValue=[IntPtr]::Zero
while([HellfireProbe]::SendMessageTimeout([IntPtr]$main.handle,1024,[IntPtr]::Zero,[IntPtr]104,2,200,[ref]$readyValue).ToInt64() -eq 0){
 if($ready.Elapsed.TotalSeconds -gt 15){throw 'Owned Winamp startup readiness deadline'}
 Start-Sleep -Milliseconds 200
}
if($DismissStartup){
 $script:windows | Where-Object {$_.class -eq '#32770' -and $_.title -eq 'Add Media to Library'} | ForEach-Object {[HellfireProbe]::PostMessage([HellfireProbe]::GetDlgItem([IntPtr]$_.handle,1),245,[IntPtr]::Zero,[IntPtr]::Zero)|Out-Null}
 Start-Sleep -Milliseconds 250;Windows
}
$script:items=[Collections.Generic.List[object]]::new()
function MenuWalk([IntPtr]$menu){
 if(!$menu.ToInt64()){return}
 for($i=0;$i -lt [HellfireProbe]::GetMenuItemCount($menu);$i++){
  $str=[Text.StringBuilder]::new(512);[HellfireProbe]::GetMenuString($menu,$i,$str,512,1024)|Out-Null
  $sub=[HellfireProbe]::GetSubMenu($menu,$i)
  if($sub.ToInt64()){MenuWalk $sub}else{
   if($str.ToString() -match 'NEOWULF|Teufel'){$script:items.Add([pscustomobject]@{title=$str.ToString();id=[HellfireProbe]::GetMenuItemID($menu,$i);checked=(([HellfireProbe]::GetMenuState($menu,$i,1024) -band 8) -ne 0)})}
  }
 }
}
foreach($kind in @(0,4)){MenuWalk (Ipc $kind 281)}
if($OpenDecks){
 $script:items | Sort-Object id -Unique | Where-Object {-not $_.checked} | ForEach-Object {[HellfireProbe]::PostMessage([IntPtr]$main.handle,273,[IntPtr]$_.id,[IntPtr]::Zero)|Out-Null}
 Start-Sleep -Milliseconds 800;Windows
}
if($ShowOwnedDecks){
 $script:windows | Where-Object {$_.class -eq 'BaseWindow_RootWnd' -and -not $_.visible -and $_.title -match 'NEOWULF|Teufel'} | ForEach-Object {[HellfireProbe]::ShowWindow([IntPtr]$_.handle,4)|Out-Null}
 Start-Sleep -Milliseconds 250;Windows
}
if($Play){
 if($Sample){
  $samplePath=(Resolve-Path -LiteralPath $Sample).Path
  if(!$samplePath.StartsWith((Join-Path $Root 'native-output\'),[StringComparison]::OrdinalIgnoreCase)){throw 'Only the owned generated audio sample is allowed'}
  Ipc 0 101 | Out-Null
  if(![HellfireProbe]::Enqueue([IntPtr]$main.handle,$samplePath)){throw 'Owned sample enqueue deadline'}
 }
 Ipc 0 102 | Out-Null;Start-Sleep -Milliseconds 600
 if((Ipc 0 104).ToInt64() -ne 1){
  $diagnosis=[pscustomobject]@{playing=(Ipc 0 104).ToInt64();listLength=(Ipc 0 124).ToInt64();trackSeconds=(Ipc 1 105).ToInt64();positionMs=(Ipc 0 105).ToInt64()}
  $diagnosis|ConvertTo-Json|Set-Content (Join-Path $Output 'playback-failure.json') -Encoding UTF8
  throw ('Owned Winamp did not start playback; motion capture rejected: '+($diagnosis|ConvertTo-Json -Compress))
 }
}
$status=@{observedUtc=[DateTime]::UtcNow.ToString('o');pid=$p.Id;processStarted=$p.StartTime.ToUniversalTime().ToString('o');exe=$p.Path;playing=(Ipc 0 104).ToInt64();positionMs=(Ipc 0 105).ToInt64();windows=@($script:windows);menu=@($script:items|Sort-Object id -Unique)}
$status | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $Output 'native-windows.json') -Encoding UTF8
$capture=$script:windows | Where-Object {$_.class -eq 'BaseWindow_RootWnd' -and $_.visible -and $_.w -gt 3 -and $_.h -gt 3}
if(!$capture){throw 'No visible native skin windows'}
if($MainOnly -or $Frames -gt 1){$capture=@($capture|Where-Object {$_.w -eq 836 -and $_.h -eq 345})}
if(!$capture){throw 'Observed main layout absent'}
$topmostBefore=@{}
$framesInMemory=[Collections.Generic.List[object]]::new()
$watch=[Diagnostics.Stopwatch]::StartNew()
try {
 for($frame=0;$frame -lt $Frames;$frame++){
  foreach($w in $capture){
   # Winamp replaces the main title with the track title.
   if($Frames -gt 1 -and ($w.w -ne 836 -or $w.h -ne 345)){continue}
   if($CaptureMode -eq 'Screen' -and $frame -eq 0){
    $topmostBefore[$w.handle]=(([HellfireProbe]::GetWindowLong([IntPtr]$w.handle,-20) -band 8) -ne 0)
    [HellfireProbe]::SetWindowPos([IntPtr]$w.handle,[IntPtr](-1),0,0,0,0,19)|Out-Null
    Start-Sleep -Milliseconds 200
   }
   if($MotionROI){
    if($CaptureMode -ne 'Screen' -or @($capture).Count -ne 1){throw 'MotionROI requires one owned main Screen capture'}
    $startPlaying=(Ipc 0 104).ToInt64()
    $sampled=[HellfireProbe]::SampleLabel([IntPtr]$w.handle,($w.x+334),($w.y+59),$Frames)
    $sampled[0].playing=$startPlaying;$sampled[$sampled.Count-1].playing=(Ipc 0 104).ToInt64()
    foreach($f in $sampled){$framesInMemory.Add($f)}
    $frame=$Frames;break
   }
   $bmp=[Drawing.Bitmap]::new($w.w,$w.h);$g=[Drawing.Graphics]::FromImage($bmp)
   try {
    if($CaptureMode -eq 'Screen'){
     foreach($point in @(@(130,260),@(400,80),@(750,270),@(150,200),@(600,200))){
      $pt=[HellfireProbe+POINT]::new();$pt.x=$w.x+$point[0];$pt.y=$w.y+$point[1]
      $under=[HellfireProbe]::GetAncestor([HellfireProbe]::WindowFromPoint($pt),2)
      if($under.ToInt64() -ne $w.handle){throw "Owned main window is occluded at $($point[0]),$($point[1]); expected=$($w.handle) actual=$($under.ToInt64()); screen capture rejected"}
     }
     $g.CopyFromScreen($w.x,$w.y,0,0,[Drawing.Size]::new($w.w,$w.h))
    }else{
     $dc=$g.GetHdc()
     try{$ok=[HellfireProbe]::PrintWindow([IntPtr]$w.handle,$dc,2)}finally{$g.ReleaseHdc($dc)}
     if(!$ok){throw "Native capture failed: $($w.title)"}
    }
   }catch{$bmp.Dispose();throw}finally{$g.Dispose()}
   $name=($w.title -replace '[^a-zA-Z0-9]','_')+'_'+$frame.ToString('000')+'.png'
   $framesInMemory.Add([pscustomobject]@{bitmap=$bmp;name=$name;elapsedMs=$watch.Elapsed.TotalMilliseconds;playing=if($frame%10 -eq 0 -or $frame -eq $Frames-1){(Ipc 0 104).ToInt64()}else{$null}})
  };if($Frames -gt 1){Start-Sleep -Milliseconds 33}
 }
 # Encoding PNG after sampling avoids measuring disk compression as paint cadence.
 foreach($f in $framesInMemory){$f.bitmap.Save((Join-Path $Output $f.name),[Drawing.Imaging.ImageFormat]::Png)}
 @($framesInMemory|Select-Object name,elapsedMs,playing)|ConvertTo-Json|Set-Content (Join-Path $Output 'capture-timing.json') -Encoding UTF8
}finally{
 foreach($f in $framesInMemory){$f.bitmap.Dispose()}
 foreach($handle in $topmostBefore.Keys){if(-not $topmostBefore[$handle]){[HellfireProbe]::SetWindowPos([IntPtr]$handle,[IntPtr](-2),0,0,0,0,19)|Out-Null}}
}
[pscustomobject]@{pid=$p.Id;playing=$status.playing;visibleNativeWindows=@($capture).Count;nativeMenuItems=@($status.menu).Count;output=$Output;frames=$Frames;captureMode=$CaptureMode;motionROI=[bool]$MotionROI} | ConvertTo-Json -Compress
