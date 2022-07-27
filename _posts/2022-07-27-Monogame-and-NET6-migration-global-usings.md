---
title: "MonoGame and .NET6 migration: global usings"
date: 2022-07-27 08:10:00 +0100
#classes: wide
header:
  image: assets/images/default-header.png
categories:
  - blog
  - tech
tags:
  - gamedev
  - c#
  - net6
  - xna
  - monogame
  - android
  - pc
---

The recent update of MonoGame to version 3.8.1 brings many additional features coming from the usage of newest .NET6 framework. While it is straightforward to make use of such features when developing a new project from scratch, it is difficult to implement them when migrating an existing solution. This short post is about a quick way to adapt your existing codebase to implement the **global using** directives available in **C#10**.
First of all, a brief description on what are the global using directives. The global using is a new feature that allows developers to declare a namespace globally in a project so that this namespace is imported and available to all files in the application. The idea behind this feature is to keep the code concise and do not have the same duplicate lines in every *.cs file. The relation to MonoGame project is quite easy to deduce: in all MonoGame projects the `Microsoft.Xna.Framework.*` declarations are omnipresent at the top of all C# project files.
There are two ways to introduce global using declarations to a project:
## 1) By specifying the namespace with a “global using” declaration in one of the files:
```c#
global using System.SomeNamespace;
```

## 2) By declaring the namespace in a project file:
```c#
<Using Include="System.SomeNamespace" />
```

I prepared a simple script that will:
- Remove all “Microsoft.Xna.Framework.*” statements
- Modify *.csproj project files to include these namespaces globally


It is quite handy, as there’s no built-in way to clean those namespaces automatically. 
You can find this script on my [GitHub Page](https://github.com/konradzaba/MonoGameScripts/blob/main/CleanMonogameUsings.csx): [CleanMonogameUsings.csx](https://github.com/konradzaba/MonoGameScripts/blob/main/CleanMonogameUsings.csx)

<!-- https://lab.lepture.com/github-cards/#konradzaba/MonoGameScripts|default -->
<div class="github-card" data-github="konradzaba/MonoGameScripts" data-width="600" data-height="" data-theme="default"></div>
<script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"></script>

To use this script, first launch the Developer Command Prompt for Visual Studio:
  ![Release screen]({{ site.url }}/images\2022-07-27-net6-global-usings/dev-cmd.png){: .align-center}
And then type-in the following command to execute the script: 
```c#
csi C:\CleanMonogameUsings.csx C:\PathToTheSolution
```
The first argument is the path to the downloaded script and the second argument is the path to the folder with your MonoGame solution. After a few moments, depending on the number of classes and projects in your solution, the script will finish. I hope you will find it useful. 

Please feel encouraged to comment this post and share your findings related to migration of current MonoGame solutions. I recommend you to check my small game [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure) which I did in MonoGame with techniques described on this technical blog.


[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FMonogame-and-NET6-migration-global-usings%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)