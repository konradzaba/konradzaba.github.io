---
title: "MonoGame and XNA performance cheat sheet: Update function"
date: 2021-03-15 18:10:00 +0100
header:
  image: assets/images/clocks.jpg
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

This is the second blog post in the MonoGame & XNA performance cheat sheet collection. I received some comments concerning the first part on twitter and I updated that entry – thank you for all your suggestions. So without further ado, this post will concern the possibilities for performance improvements in the `Update()` function. All these possibilities were used in my small game that you can check right here [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure). It’s a non-profit game: free with no ads.

![Vorn]({{ site.url }}/images/vorn.jpg){: .align-center}

## 1) Desynchronized threads


The main problem for me when working on Android code was the single threaded performance. Usually, games (and in general 3D graphics applications) are a very hard case for multithreading. Even the 6 or 7 year old devices host at least 4 CPU cores that just ask to be used. The issue is that sometimes those cores can be extremely slow – for example, I use Samsung A3 from 2014 for testing as the slowest device which has 4x Cortex-A53 1.2 Ghz. On the other hand, the newer devices commonly come with CPU cores that have variable performance. The second device I use, Sony Xperia XA1 has 8 Cortex-A53 cores: 4 being 2.3 Ghz and the other ones being 1.6 Ghz. In that case, you as a developer have zero impact on which CPU core is used for your work.

An interesting idea for slow CPU cores is using desynchronized threads. The idea is that we want to perform some work that will not finish in due time for the next frame. Instead, the computations will be performed in the background and these will finish later.

In my particular case, model animation was a huge bottleneck. So I’m using a MilkShape model with some very old C# code found on the [CodeProject](https://www.codeproject.com/Articles/148034/Loading-and-rendering-Milkshape-3d-models-with-ani) to update the animations. The model animation itself is a totally separate topic, needless to say professionally this should be performed with vertex shaders for correct performance. Nevertheless, the code is what it is and I have to use it for animating my model. The problem is, when the animations are performed on CPU, these take a lot of time – often more than 33ms on slowest mobile cores. As a result:

•	Doing this task on a main thread is completely out of question as it would consume all the resources for `Update()` function.
![main thread]({{ site.url }}/images/2021-03-15-perf2/desync1.png){: .align-center}

•	Doing this task on a separate thread with synchronization would still make our game run below 30 FPS as we are exceeding the budget of 33 ms on many devices.
![anim thread]({{ site.url }}/images/2021-03-15-perf2/desync2.png){: .align-center}

What to do in such case? My idea is to desynchronize the update thread for animation from the drawing. This will not cause any performance degradation (hitches) as simply the same animation pose will repeat for a more than a single frame. On the faster devices with variable CPU clocks the issue most likely won’t be very visible for the user. On the slowest devices (aforementioned phone with 1.2 Ghz CPU cores) the animation may appear “slow-mo”  but the game will be still playable for the user.

<figure>
  <a href='/assets/videos/cheatsheet-fast.webm'>
    <video style='width: 100%' src='/assets/videos/cheatsheet-fast.webm' alt='Normal speed' loop muted preload autoplay>
      Your browser does not support HTML5.
    </video>
  </a>
</figure>
Normal speed of animation.

<figure>
  <a href='/assets/videos/cheatsheet-slow.webm'>
    <video style='width: 100%' src='/assets/videos/cheatsheet-slow.webm' alt='Slowed' loop muted preload autoplay>
      Your browser does not support HTML5.
    </video>
  </a>
</figure>
The same animation with artificially added slowdown (`Thread.Sleep()`) in thread.

The code pattern is quite straightforward in that case:

```c#
private Task _playerUpdate;
public override void Update(GameTime gameTime)
{
	if (_playerUpdate == null || (_playerUpdate != null && _playerUpdate.IsCompleted))
	_playerUpdate = Task.Factory.StartNew(() => 
		UpdateAnimationPlayerWithValidation(gameTime), TaskCreationOptions.LongRunning);
	...
}
```
Of course the animation here is just an example, this concept can be used for each case where tasks can be desynchronized without significant consequences.

One last thing to notice, a pretty similar approach can be used for the `Draw()` function in case of RenderTargets. You can think of half-rate refresh – for example, if `Draw()` function exceeds your budget and you have some RenderTargets e.g. for reflections, you can refresh them alternately.


## 2) Use double buffering for data
If we look at the code from perspective, what it really does, is it calls `Update()` and `Draw()` functions one after another. What to do though, if we want to perform a longer update on data that must be drawn? 

I suggest double buffer – the high level concept is: while one buffer is being updated, you are drawing the second one. Then, when the update finishes,as simple as that you swap buffers. I use this concept for many functionalities, among these updating the [PVS](https://en.wikipedia.org/wiki/Potentially_visible_set). I prepared a very simple template that I use everywhere where it is suitable in my code:

```c#
public class BufferedData<T>
{
	public T Buffer1;
	public T Buffer2;
	public bool IsActiveBuffer1;

	public BufferedData(T buffer)
	{
		Buffer1 = buffer;
		Buffer2 = buffer;
	}

	public T GetActive()
	{
		return IsActiveBuffer1 ? Buffer1 : Buffer2;
	}
}
```

## 3) Use Vector.Methods for high performance computations
Both MonoGame and .NET provide special methods that pass the arguments by reference. These are significantly faster than the standard C# math operators. But that’s not the whole story: these methods also support [SIMD instructions](https://docs.microsoft.com/pl-pl/dotnet/standard/simd) on some devices making the performance far better. 

Consider the following code:

```c#
private void Benchmark()
{
	//prepare data
	const int count = 10000000;
	Vector2 result1 = new Vector2();
	Vector2 result2 = new Vector2();
	Vector2[] data = new Vector2[count];
	float[] multiplier = new float[count];
	Random random = new Random(0);

	for(int i=0; i< count; i++)
	{
		var x = (float)random.NextDouble()*100;
		var y = (float)random.NextDouble()*100;
		var vector = new Vector2();
		vector.X = x;
		vector.Y = y;
		data[i] = vector;
		multiplier[i] = (float)random.NextDouble();
	}

	//Easy to read, but slow!
	var sw = new Stopwatch();
	sw.Start();

	for (int i = 0; i < count; i++)
		result1 += data[i] * multiplier[i];

	sw.Stop();
	var standardTime = sw.ElapsedMilliseconds;

	//More verbose, yet faster
	sw.Reset();
	sw.Start();

	Vector2 tmp = new Vector2();
	for (int i = 0; i < count; i++)
	{
		Vector2.Multiply(ref data[i], multiplier[i], out tmp);
		Vector2.Add(ref result2, ref tmp, out result2);
	}

	sw.Stop();
	var fasterTime = sw.ElapsedMilliseconds;
	bool isAccelerated = System.Numerics.Vector.IsHardwareAccelerated;
	Text = $"SIMD={isAccelerated} Standard={standardTime} Faster={fasterTime}";
}
```
Don’t forget to check the `Optimize code` setting and uncheck `Prefer 32-bit` – these are necessary for SIMD optimizations to work. The test gives the following results:


|                   | CPU Core                    | Is SIMD accelerated? | Standard (ms)| Faster (ms) |
|:------------------|:---------------------------:|---------------------:|:------------:|------------:|
| Samsung GT-I8190N | Cortex-A9 1.0 Ghz           | False                | 334          | 166         |
| Samsung A3 2014   | Cortex A-53 1.2 Ghz         | False                | 228          | 137         |
| SONY XA1          | Cortex A-53 2.3 Ghz         | False                | 137          | 72          |
|-----------------------------------------------------------------------------------------------------|
| PC (terminal)     | Sempron 2100+ (1 Ghz)       | False                | 566          | 91          |
| Laptop            | i7-3632QM (3.2 Ghz)         | True                 | 171          | 13          |
| Laptop            | i5-4210M (3.2 Ghz)          | True                 | 153          | 13          |
| PC                | i5-8400 (2.8 Ghz)           | True                 | 122          | 10          |
| Laptop            | i7-9850H (4.6 Ghz)          | True                 | 112          | 9           |
| PC                | Ryzen 3900X (3.8 Ghz)       | True                 | 127          | 7           |
|=====================================================================================================|


One important thing, the code on PC and Laptop is not running via Xamarin, so we are comparing here apples to oranges.
Sadly SIMD instructions are not supported now on Android devices. No idea how these behave on iOS. Still as you can see, there are some quite significant performance benefits available.

Just for fun I compiled the same code for x86 and ran with 32-bits and no SIMD acceleration on some, well, less capable systems ;)

| 32-bit, No SIMD   | CPU Core                    | .NET Framework       | Standard (ms)| Faster (ms) |
|:------------------|:---------------------------:|---------------------:|:------------:|------------:|
| Laptop            | Pentium 3 700 Mhz Mobile    | 4.0                  | 592          | 456         |
| Laptop            | Pentium M 735 (1.7 Ghz)     | 4.7                  | 215          | 45          |
|=====================================================================================================|

A side note: no doubts why Intel left P4 and NetBurst, instead evolving Pentium M to C2D ;)


## 4) Pre-calculate or cache whatever possible
This one is quite obvious and does not come with any code sample, but I still think that is worth to mention. Try to look at the logic of your code from some distance. Both the `Draw()` and `Update()` functions are the focal point of the application. If there is a possibility to pre-calculate something – do it, export the results and reuse them in game. If it is possible to cache something – cache it, no matter if you’re coding for a phone, console or PC, there’s a lot of RAM to use on current devices.

The next post will concern some low-level optimizations and best practices for both `Draw()` and `Update()` functions. Please feel encouraged to comment this post and share your findings related to performance. I also recommend you to check my small game [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure) where I implemented all techniques mentioned in this article.

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FMonogame-and-XNA-performance-cheat-sheet-Update-function%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)