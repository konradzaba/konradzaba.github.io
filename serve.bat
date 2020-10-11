copy _site\sitemap.xml sitemap.xml
powershell.exe "((Get-Content -path sitemap.xml -Raw) -replace 'http://localhost:4000/','https://konradzaba.github.io/') | Set-Content -Path sitemap.xml"
bundle exec jekyll serve