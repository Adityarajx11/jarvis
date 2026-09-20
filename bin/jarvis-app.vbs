Set s = CreateObject("WScript.Shell")
' Hidden launcher: no console window at all
s.Run """C:\Program Files\nodejs\node.exe"" ""F:\jarvis\bin\jarvis.js"" app", 0, False
