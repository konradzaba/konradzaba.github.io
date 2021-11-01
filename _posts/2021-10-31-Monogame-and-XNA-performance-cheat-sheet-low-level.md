---
title: "MonoGame and XNA performance cheat sheet: low level optimizations"
date: 2021-11-01 10:10:00 +0100
#classes: wide
toc: true
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

The last blog post (at least for now) concerning MonoGame performance deals with some general do’s and don’ts as well as a few techniques for low level optimization. These are applicable both to `Update()` and `Draw()` functions. Remember that these functions are executed in a loop dozens of times per second. That is a very different use case than other code portions. Please remember that you should never use low level optimization prematurely as it will occlude your source code. Unfortunately, highest performance possible sometimes does not get along with clear code. Always aim for a high quality design – make the code nice, modular and easily modifiable. Only when it’s complete and correct, check the performance – do not optimize until you know you need to. Hence, I will clearly mention below if I consider given technique being low level optimization. Some of the techniques given below might be blatantly obvious, however I still want to mention them as in the heat of coding one may forget even the easiest thing.

## 1) Do not allocate unnecessary objects in loops

This one may be very simple but please do remember that creating new objects in a loop inside functions such `Draw()` or `Update()` which are executed up to 60 times a second is an obvious performance hog. Not only it is slower, but it will force Garbage Collector to perform cleanup more often. This results in stuttering at seemingly random moments.
The following code was creating severe hiccups in my case:

```c#
Parallel.For(0, _groupCount, i =>
{
	var groupVertices = Groups[i].vertices.Count();
	Groups[i].verticesPhone = new VertexPositionNormalTexture[groupVertices];
	for (int j = 0; j < groupVertices; j++)
	{
		Groups[i].verticesPhone[j] = new VertexPositionNormalTexture(Groups[i].vertices[j].Position, Groups[i].vertices[j].Normal, Groups[i].vertices[j].texCoord1);
	}
});
```

A small refactoring to the code helped significantly:

```c#
Parallel.For(0, _groupCount, i =>
{
	var groupVertices = Groups[i].vertices.Count();

	if (Groups[i].verticesPhone == null)
		Groups[i].verticesPhone = new VertexPositionNormalTexture[groupVertices];

	for (int j = 0; j < groupVertices; j++)
	{
		if (Groups[i].verticesPhone[j] == null)
			Groups[i].verticesPhone[j] = new VertexPositionNormalTexture(Groups[i].vertices[j].Position, Groups[i].vertices[j].Normal, Groups[i].vertices[j].texCoord1);
		else
		{
			Groups[i].verticesPhone[j].Position = Groups[i].vertices[j].Position;
			Groups[i].verticesPhone[j].Normal = Groups[i].vertices[j].Normal;
			Groups[i].verticesPhone[j].TextureCoordinate = Groups[i].vertices[j].texCoord1;
		}
	}
});
```


## 2) Always publish code with code optimizations enabled

The Release configuration optimizes the source code. By default the code optimizations are disabled in Debug configuration.
 
 ![Release screen]({{ site.url }}/images\2021-31-10-perf3/release.png){: .align-center}

I was quite shocked when I heard from a senior developer that there are no differences between Debug and Release builds in Visual Studio. That’s not true. The code optimization **will** make your C# code a bit faster.



## 3) Cache the variable when indexing
This is a low level optimization, but I don’t think it necessarily occludes the source code. Let’s consider such code snippet:

```c#
SomeObject[] objectArray;

void DoSomeStuff()
{
    for(int i=0; i<objectArray.Length; i++)
    {
        objectArray[i].Position += something;
        objectArray[i].Velocity *= whatever;
        objectArray[i].Counter++;
    }
}
```

An array index costs about the same as JIT method call, plus some overhead for bounds checking. You can cache the variable to remove this overhead.

```c#
void DoSomeStuff()
{
    for(int i=0; i<objectArray.Length; i++)
    {
        SomeObject obj = objectArray[i];
        obj.Position += something;
        obj.Velocity *= whatever;
        obj.Counter++;
    }
}
```
This particular tip comes from the Sgt. Conker website that is sadly no longer there.


## 4) Avoid unnecessary boxing/unboxing operations
So first let’s review what these terms actually mean:
-	Boxing is converting object from value type to a reference type
-	Unboxing is converting object from reference type to a value type

A simplest example would be converting a value type to `System.Object` such as:
```c#
int value = 15; 
object box = value;
```
Boxing and unboxing are bad as they are allocating data on a heap which in turn saturates Garbage Collector. And as already mentioned, using boxing/unboxing in a loop at runtime will surely cause performance issues. Let’s consider a more real-life example. Boxing can occur for example if you use an enum as a key in a `Dictionary<Enum,something>` collection. You can avoid boxing by using `Dictionary<int,something>` and casting to int when indexing:

```c#
enum YourEnum
{
    A, B, C
}

//adding elements will cause boxing.
Dictionary<YourEnum, string> dictionaryWithBoxing = new Dictionary<YourEnum, string>()
{
    { YourEnum.A, "a" },
    { YourEnum.B, "b" },
    { YourEnum.C, "c" },
}

//no boxing!
Dictionary<int, string> yourDictionaryWithoutBoxing = new Dictionary<int, string>()
{
    { (int)YourEnum.A, "a" },
    { (int)YourEnum.B, "b" },
    { (int)YourEnum.C, "c" },
}
```
This particular tip comes from the Sgt. Conker website that is sadly no longer there.

## 5) Variables vs properties
**Halt! This one is a very low level optimization. Never use it if there are other low hanging fruits and never apply it to whole source code. Use wisely only if you have a CPU performance issue.**

The properties are great for readability and maintainability where performance isn’t of much concern. When coding for a PC you will almost certainly never run into an issue coming from properties. The story might be different if you are aiming for other devices, i.e. couple years old Android phones where every cycle will count on poor Cortex A-53. This is due to the fact, that properties are roughly equivalent to a JIT method call which takes some time to execute. If you have a property that is very often accessed many times in many loops you can get a few miliseconds by converting it to a variable.

## 6) Do not use try-catch if unnecessary
If for any reason you happen to use try-catch clause in a loop in `Draw()` or `Update()` function, try to avoid it if possible. There is a small overhead created even if no exception is raised. While in usual code this overhead is absolutely insignificant, it may slow down your code quite significantly if it is called in a loop.

## 7) Do not use reflections if unnecessary
Well, that one might be obvious but just avoid using reflections if these are unnecessary. I’ve seen scenarios where even in web development the reflections may cause significant performance issues. Hence when dealing with reflections in game or 3D development using these especially in loops is a huge **NO**.

## 8) Use StringBuilder for concatenating
Another quite obvious tip is to use `StringBuilder` for concatenation. Concatenating strings at runtime is expensive as each piece concatenated is another allocated string. When `StringBuilder` is used instead, the pieces added aren’t concatenated on the heap.  This tip is useful also in other types of development i.e. web development.

## 9) Loop performance
**Halt! This one is a very low level optimization. Never use it if there are other low hanging fruits and never apply it to whole source code. Use wisely only if you have a CPU performance issue.**

If it is possible I’ll pick always `foreach` instead of `for`. The syntactic sugar makes code more cleaner and easier to read. But what about the performance? 
I’ve made a test between `foreach` and `for` on lists using the following code.

```c#
static double ListWithForeach(List<int> items)
{
	var sum = 0;
	var sw = Stopwatch.StartNew();
	foreach(var item in items)
	{
		sum += item;
	}
	sw.Stop();
	return sw.Elapsed.TotalMilliseconds;
}

static double ListWithFor(List<int> items)
{
	var sum = 0;
	var sw = Stopwatch.StartNew();
	for(var i=0; i<items.Count; i++)
	{
		sum += items[i];
	}
	sw.Stop();
	return sw.Elapsed.TotalMilliseconds;
}
```

Then I tested it both on my PC (using .NET5) and on Android (using Xamarin with .NET Standard2). The list had 100000000 items, and I tested the functions with few dozens of repetitions. And these are the mean results:

|                   | CPU Core                    | ListWithForeach      | ListWithFor  | 
|:------------------|:---------------------------:|---------------------:|:------------:|
| Desktop           | Ryzen 3900X (3.8 Ghz)       | 180,33 ms            | 55,61  ms    | 
| Samsung A71       | Kryo 470 Gold 2.2 GHz       | 609,57 ms            | 486,95 ms    | 
|=======================================================================================|

I think that this optimization can be applied only in critical places when you are iterating over collections in `Draw()` or `Update()` functions.

The previous posts concerned improvements for `Draw()` and `Update()` functions. You can find them respectively [here](https://konradzaba.github.io/blog/tech/Monogame-and-XNA-performance-cheat-sheet-Draw-function/) and [there](https://konradzaba.github.io/blog/tech/Monogame-and-XNA-performance-cheat-sheet-Update-function/). Please feel encouraged to comment this post and share your findings related to performance. I also recommend you to check my small game [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure) where I implemented all techniques mentioned in this article.


[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FMonogame-and-XNA-performance-cheat-sheet-low-level%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)