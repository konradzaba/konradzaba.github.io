---
title: "MonoGame and XNA performance cheat sheet: Draw function"
date: 2020-11-02 18:10:00 +0100
header:
  image: assets/images/clocks.jpg
classes: wide
categories:
  - blog
  - tech
tags:
  - vorn
  - gamedev
  - xamarin
  - c#
  - xna
  - monogame
  - android
  - pc
---

The following posts are a compilation of my personal do’s and don’ts regarding achieving good CPU performance in XNA and MonoGame. I’m absolutely not claiming to be an expert in this field, however I found a lot of interesting issues and possibilities that might be not obvious for everyone. The vast majority of my findings come from development of a small game that I did together with a friend.  It is free and it has no ads, so if you have Android phone please feel free to check it: [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure). What is amusing, doing backend web development professionally yields both positive and negative practices when developing MonoGame and XNA applications. Some practices should be avoided, others are welcome. I will elaborate on these all topics when discussing the particular issues. Please share in the comments down below your own findings!

First, let’s start with the obvious – we are interested in achieving the best possible performance in `Draw()` and `Update()` calls, as these are called in a loop. Of course, the `LoadContent()` function is also important as it defines how long it takes to load the application – this is however a different topic and I don’t plan on touching it soon.
One important thing to understand is that it is necessary to profile before applying any optimization. If you have a severe performance issue, most likely you won’t find an answer to your problem here. Profile your code and find the culprit. However, if you would like to find missing ~20% of CPU time – please continue. That’s actually the rough estimation of my gains through optimization when developing my first game for Android.

One unfortunate fact that comes from some optimizations is less readable code. Regrettably, writing clean nice code often works against achieving good performance. My approach towards this problem is: optimize only where necessary. That’s why apart from `Draw()` and `Update()` functions, I try to refrain from unnecessary optimizing. I prefer to have a cleaner code than to get a fraction of second where it is not necessary. When discussing each possibility, I will provide information when and if it should be used.
So, without further ado, this first post will concern `Draw()` calls. The second post will touch `Update()` calls, and the last one some common good practices as well as lower level optimizations.

## 1) Use EffectTechnique and EffectParameters to set parameters for drawing
In vast majority of XNA and MonoGame tutorials, you will notice that the parameters for drawing are set by using strings. As a result such code is quite common:

```c#
public void Draw()
{
	_effect.CurrentTechnique = _effect.Techniques[“Colored”];
	_effect.Parameters["xView"].SetValue(_viewMatrix);
	_effect.Parameters["xProjection"].SetValue(_projectionMatrix);
	_effect.Parameters["xWorld"].SetValue(_worldMatrix);
	_effect.Parameters["xAmbient"].SetValue(AmbientLightPower);
	
	...
}
```

While this code works perfectly well and it is suitable for tutorials, it is not a good practice to pass the drawing parameters by string. This has a significant penalty on CPU performance. Therefore, this code shall be refactored:

```c# 
private EffectTechnique _coloredTechnique;
private EffectParameter _viewParameter;
private EffectParameter _projectionParameter;
private EffectParameter _worldParameter;
private EffectParameter _ambientLightPowerParameter;

private void InitEffectParameters()
{
	_coloredTechnique = _effect.Techniques[“Colored”];
	_viewParameter = _effect.Parameters["xView"];
	_projectionParameter = _effect.Parameters["xProjection"];
	_worldParameter = _effect.Parameters["xWorld"];	
	_ambientLightPowerParameter = _effect.Parameters["xAmbient"];
}

public void Draw()
{
	_effect.CurrentTechnique = _coloredTechnique;
	_viewParameter.SetValue(_viewMatrix);
	_projectionParameter.SetValue(_projectionMatrix);
	_worldParameter.SetValue(_worldMatrix);
	_ambientLightPowerParameter.SetValue(_ambientLightPower);
	
	...
}
```

From my experience, usage of `EffectTechnique` and `EffectParameters` improves the CPU time necessary for drawing significantly - in my case, the total time spent for drawing decreased by up to 20%. I suggest using the `EffectParameters` everywhere instead of parameters passed by strings. It is possible to use the `Parameters` indexed property on `Effect` to access any effect parameter, but this is slower than using `EffectParameters`. Creating and assigning an `EffectParameter` instance for each technique is therefore a good practice.

## 2) Caching of EffectParameters
From my experience, only the parameters that are changed are sent to GPU when an effect pass is applied. Therefore, if some parameters do not need to be updated these should not be set in the draw call as this consumes unnecessarily the CPU time. Let’s consider the previous example and assume that the `_ambientLightPower` is a constant parameter. This allows to cache this parameter and remove the unnecessary `SetValue` call.

```c#
public void Draw(bool done = false)
{
	_effect.CurrentTechnique = _coloredTechnique;
	_viewParameter.SetValue(_viewMatrix);
	_projectionParameter.SetValue(_projectionMatrix);
	_worldParameter.SetValue(_worldMatrix);
	
	if(!done)
	{
		_ambientLightPowerParameter.SetValue(_ambientLightPower);
	}
	
	...
	
	done = true;
}
```
I suggest applying this approach in functions where further changes are not expected. The less `SetValue` calls, the better performance.

## 3) Minimize draw calls
One universal rule across all frameworks and engines is to try to minimize the draw calls necessary to render the scene. Excessive draw calls may totally ruin the performance. Fortunately, there are many ways in which the number of draw calls may be minimized. My suggestion is to analyze all loops used in `Draw()` functions for possibility of improvements.
Here we will analyze an interesting case from my own project where excessive draw calls were the obvious big problem. The following is an example screenshot from my game.

![Sample screen - first area]({{ site.url }}/images\2020-11-02-perf/Screenshot_1604317662.jpg){: .align-center}

The floor consists of tiles, being simple squares of equal size. Since these are squares, each is composed of two triangles. Each tile can have a different texture assigned. Therefore the floor is actually a matrix of tiles. The first naïve approach was to just draw each tile separately.

```c#
foreach (LevelTile tile in tilesToDraw)
{
	tile.DrawFloor();
}
```

Assuming that in our [PVS](https://en.wikipedia.org/wiki/Potentially_visible_set) there are around 20 tiles to be displayed horizontally everywhere and there are 50 rows of tiles vertically, this means that there are in total 1000 elements in `tilesToDraw` collection. In other words, there are 1000 draw calls necessary to render the visible floor solely. The performance was so bad that the rendering on a mobile device was in practice a slideshow. Given that each tile is composed of two triangles, only 2000 triangles are drawn.
To solve this problem, I verified that in all those tiles, there only 27 textures used. Based on the screen given above, the following textures are displayed for floor.
![Textures used in first area]({{ site.url }}/images\2020-11-02-perf/textures.png){: .align-center}
So, given the fact that all other parameters do not change, it is best to group the tiles by textures so that only as many draw calls are necessary as textures are to be rendered. Now instead of `2` triangles, `N*2` are drawn in each draw call. As a result, the function `DrawFloor()` is called only 27 times and the performance is improved many times. If you are interested in details for the functions, please let me know in the comments below and I will share them.
An observant reader may notice that this can be improved even more – if tiles with the same texture are neighbors, then these can be merged into less triangles. I tried this approach in code, but with small number of triangles that made no sense and the code was really cluttered.

## 4) Do not put any logic in draw calls
Well, this one may be quite obvious, but it is worth to notice it – refrain from putting any unnecessary logic in the draw calls. Refactor your code to keep the logic in the `Update()` function (perhaps even asynchronous) as the `Draw()` function is often the one that needs performance improvements. When using rendertargets sometimes we must draw the scene many times, and any computations left in the `Draw()` function will worsen the resulting performance of the application.

## 5) Do not create unnecessary SpriteBatches
It is a bad idea to create new `SpriteBatch` objects in each frame. I will cite the user [LithiumToast from MonoGame forums](https://community.monogame.net/t/using-the-spritebatch-the-correct-way/8082/9?u=elzabbul)  as he explained it nicely:
> Take a look at the source code of [SpriteBatch](https://github.com/MonoGame/MonoGame/blob/develop/MonoGame.Framework/Graphics/SpriteBatch.cs) (along with it’s helpers: [SpriteBatcher](https://github.com/MonoGame/MonoGame/blob/develop/MonoGame.Framework/Graphics/SpriteBatcher.cs), and [SpriteBatchItem](https://github.com/MonoGame/MonoGame/blob/develop/MonoGame.Framework/Graphics/SpriteBatchItem.cs)). Each `SpriteBatch` instance has a unique `SpriteBatcher` instance which has an array of `SpriteBatchItem` classes.
>Each `SpriteBatch` instance (along with its helpers) does not use much space when it’s first created but can demand more space as the batch item buffer, vertex array buffer (not a GPU `VertexBuffer`) and index array buffer grow to meet the demand of many `SpriteBatch.Draw` calls. Currently, there is an upper limit of 5461 (`(int)(short.MaxValue / 6`)) for how many `SpriteBatchItem` classes can be created per `SpriteBatcher` instance. As the `SpriteBatchItem` array grows, the vertices and indices array also grow to match where each `SpriteBatchItem` takes 4 vertices and 6 indices. So the maximum number of `VertexPositionColorTexture` vertices and short indices is 21844 and 32766 respectively. The minimum number of vertices and indices is 1024 and 1536 respectively. Don’t forget that the array of `SpriteBatchItem` takes space and each `SpriteBatchItem` class as well. So all in all, I wouldn’t recommend creating new `SpriteBatch` instances willy nilly, and definitely not every frame, but it doesn’t hurt to have a couple of instances.

## 5) Use Vertex and Index buffers
This one is nicely discussed in Riemers tutorials so without unnecessary copy-pasting, just visit this [page](https://github.com/simondarksidej/XNAGameStudio/wiki/Riemers3DXNA1Terrain13buffers).

The next post will concern improvements for `Update()` function, and the last post in the series will address common practices for both `Draw()` and `Update()`. Please feel encouraged to comment this post and share your findings related to performance. I also recommend you to check my small game [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure) where I implemented all techniques mentioned in this article.

Updated:
Part 2 concerning the `Update()` function is [here](https://konradzaba.github.io/blog/tech/Monogame-and-XNA-performance-cheat-sheet-Update-function/).

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FMonogame-and-XNA-performance-cheat-sheet-Draw-function%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)