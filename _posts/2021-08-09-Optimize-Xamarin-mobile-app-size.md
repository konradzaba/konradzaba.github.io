---
title: "Optimize Xamarin mobile app sizes"
date: 2021-08-09 12:10:00 +0100
header:
  image: assets/images/header-phones.jpg
categories:
  - blog
  - tech
tags:
  - xamarin
  - monogame
  - android
  - iphone
---

One of the major issues of mobile apps especially those built with Xamarin are the app sizes. There is still a plethora of users with low-end devices having very small storage. Most users switch their phones to newer ones only if their old one stops working or has dead battery (even if it can be replaced). When your Android phone has only 8 or 16 GB of available internal storage, the app size becomes a significant concern. Basically, if your app is too large, the users will not bother installing it, as they would perhaps need to remove other application. Let’s be fair – no one will remove an app that serves productivity to install your app just for entertainment. Another aspect is purely psychological – if your app weights 100 MB it is less likely to be downloaded than the one being 99 MB large. This comes from the same reasoning as the [.99 price tag](https://www.simon-kucher.com/pl/blog/why-prices-end-99-and-other-psychological-pricing-tactics).

So this article concerns Xamarin and MonoGame (with Xamarin) applications for Android. First, before diving into specifics we need to establish how we can analyze the app size. You need to prepare a Release archive for the application and use Android Studio. Start Android Studio, then from the menu choose `Build` and `Analyze APK`. Point the file browser to your AAB (or APK) file, and let it analyze the size. The `Download Size` metric is the one that should interest you the most:

![Vorn]({{ site.url }}/images/2021-08-09-xamarinSize/apk-size.png){: .align-center}

You can easily expand the tree list and find the candidates for size optimization. So now, some ideas on what can you do to make your app smaller. First the ones that can be applied to all Xamarin.Android applications.


## 1)	Start using AAB app bundles

Google introduced the app bundles to generate and serve optimized APKs for each user’s device configuration, so that they can download only what they need to actually run the application. Hence, what the end users get is smaller and more optimized downloads.

![Vorn]({{ site.url }}/images/2021-08-09-xamarinSize/aab.jpg){: .align-center}

I suggest that you should move your existing apps to AABs as soon as possible. Google itself won’t even allow submitting new application in old APK format starting with August 2021. To build Xamarin apps as AABs, you need at least Visual Studio 2019 in version 16.4. 

![Vorn]({{ site.url }}/images/2021-08-09-xamarinSize/aab2.png){: .align-center}

What are the downsides of app bundles? One comes to my mind first: only Google Play Store supports them. This means that if you publish your app also to other stores such as Samsung Galaxy Store, you will need to generate a separate “old” APK packages.

## 2) Use D8 dex compiler and R8 code shrinker
The introduction of D8 dexer allows to build application faster (so less waiting on our, developer side) and the R8 code shrinker makes the code smaller. D8 replaces old DX dexer and R8 replaces ProGuard. It works by performing code shrinking (detection and safe removal of unnecessary field, methods, attributes and dependencies), resource shrinking (the same for resources), minification (shortening of class names and members) and optimization (i.e. removal of unnecessary code branches – `else {}` that cannot be reached). I won’t dive into details here, as this subject is explained nicely on [this page](https://medium.com/@hakimgulamali88/a-deep-dive-into-androids-d8-dexer-and-r8-shrinker-with-xamarin-ca66e00b1c8d). As you probably noticed already, these settings are available in VS just below the Android Package Format dropdown.

## 3) Link SDK assemblies only
Ensure that you are linking only the libraries that you need. Xamarin Android applications use a linked to reduce the size of the application, with three possible values:

-	None: no linking is performed
-	Sdk Assemblies Only: only links assemblies that come with Xamarin.Android. All other assemblies (such as your code) are not linked. 
-	Sdk and User Assemblies: links all assemblies, which means your code may also be removed if there are no static references

Basically, the middle option should be enabled when you want unused assemblies that you have linked to your projects be removed when the AAB/APK is built. For example, if you added an assembly to your project, but haven’t actually used it in code, this option will strip this assembly for the resulting AAB/APK reducing the overall size of the application.


## 4) Support only specific screen densities
Obviously, Android can be found on a plethora of devices with very different screen densities. In API Level 19 (Android 4.4) and higher, the following densities are supported: `ldpi`, `mdpi`, `tvdpi`, `hdpi`, `xhdpi`, `xxhdpi` and xxxhdpi. The thing is, you don’t need to export assets to each density. If there is small number of users with specific densities, it is worth to consider whether it makes sense to bundle those densities. What is important is that if you won’t include resources for specific screen densities, Android will automatically scale the existing resources for the other dependencies. If you won’t mind having scaled images, you can just prepare a single variant of an image for your app.


**The following suggestions will be more specific to MonoGame development with Xamarin.**

## 5) Manually compress the music files
Before the last release, I decided to bump up the texture resolution in my game from 128x128 to 256x256 to achieve more clarity on newer high resolution devices. Coincidentally, the app size went up by around 15 MB reaching well over 100 MBs. After using the aforementioned app size analyzer, it became clear that the music compressed with MonoGame Pipeline Tool took around 23 MB – and that’s a lot! So, I started analyzing the outputs from the pipeline tool and playing with some manual optimizations – I managed to shrink the music size to 13 MB what I consider a nice result.
For input music files (in my case: mp3’s), the MonoGame Pipeline Tool generates as an output file pairs (m4a and xnb). It seems that XNB files contain only some metadata as these are of very insignificant sizes.

![Vorn]({{ site.url }}/images/2021-08-09-xamarinSize/mp3conv.png){: .align-center}

Hence, what we want to do is to compress further the M4A files with music. Two free tools will be handy: [FFprobe and FFmpeg](https://www.ffmpeg.org/). With FFprobe you can analyze the output M4A files to determine the compression details. The following command will print all the information to console: 
`ffprobe -loglevel 0 -print_format json -show_format -show_streams "C:\path-to-folder\intro.m4a"`
Having this data, we can attempt to further compress the M4A file with FFmpeg tool. To do so, we need to use the command:
`ffmpeg -i " C:\path-to-folder\intro.m4a" -c:a aac -b:a 48k intro.m4a`
The `–b:a` parameter with value `48k` is crucial here – it determines the target (average) bit rate for the encoder. Obviously, the lower the bit rates the smaller are the resulting files, but the music quality will suffer. I suggest playing with this value and finding the bitrates that will satisfy your needs. 

## 6) Apply proper texture compression & consider dropping mipmaps
In the MonoGame Pipeline Tool, you can set the TextureFormat to different values:

![Vorn]({{ site.url }}/images/2021-08-09-xamarinSize/texconv.png){: .align-center}

These are different compression methods that are quite cryptic. The best value is `Compressed` as it is just one of the other listed methods which best suits current platform (in our case: Android). Basically the idea is, if you have no clue what to use just choose `Compressed` and it will work fine. If you have some text on textures, it may look ugly when compressed. In such cases, choose the `Color` value so that it won’t be compressed. Try to size the width and height of your textures with powers of two (64x64, 128x128, 256x256 and so on) to ensure compatibility with different Android devices.
Another thing that is worth considering is whether you need mipmaps for all textures. When you save a texture with mipmaps, multiple versions of the same texture are included (in a single file) with progressively smaller resolutions, halving next time – so, for 1024x1024 texture, these will be 512x512, 256x256, 128x128 and so on. MonoGame then uses smaller versions of textures it you are far away from it and swaps to higher resolution as you approach. A frame rate will be a bit better, but mostly, you will avoid shimmering on distant textures when camera moves. On the other hand, the mipmaps obviously increase the size of the texture. However, if your textures are very small, you can consider dropping the mipmaps without any issues and saving on some precious space.

## 7) Remove duplicates
So this one may be very obvious, but check your application for unnecessary duplicated data. What surprised me, the resulting AABs/APKs are not stripped of these. The resulting packages do include duplicates, hence the package sizes are larger!


[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FOptimize-Xamarin-mobile-app-size%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)