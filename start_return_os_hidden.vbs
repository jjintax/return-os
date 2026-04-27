Set shell = CreateObject("WScript.Shell")
shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & Replace(WScript.ScriptFullName, "start_return_os_hidden.vbs", "run_return_os.ps1") & """", 0, False
