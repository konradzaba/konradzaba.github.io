---
title: "Endomondo to Strava: transferring workouts"
date: 2020-12-13 21:10:00 +0100
header:
  image: assets/images/header-workout.jpg
categories:
  - blog
  - tech
tags:
  - endomondo
  - strava
  - c#
  - pc
---

I planned to continue with my performance tips and tricks coverage for MonoGame, however in the mean time, I received an email from Endomondo saying that an archive of my workouts is ready. Frankly speaking, I lost all hope getting this data from them, but after **SIX WEEKS** it is here.

The whole fiasco concerning closure of Endomondo and all the shenanigans with getting personal data from them is honestly worth a separate blog post. Here however, I want to discuss what matters. After a short review of different possibilities I decided to create an account at Strava and start using their app. Obviously, now I wanted to see all my archived data from Endomondo present in Strava.
First let’s see what the non-automated possibilities are. The data from Endomondo came in an archive with whooping _1266 files (710 MB+)_: each workout has two files, a _JSON_ file and a _TCX_ file. Fortunately, _TCX_ files are [standardized XML files](https://en.wikipedia.org/wiki/Training_Center_XML) which are supported by Strava. However this also means that I need to upload a not too shabby 633 files to have all my workouts there. Bad news: using Strava UI, you can upload only 25 files at once. While certainly doable in my case, some may have thousands of workouts and may spend **A LOT** of time manually uploading everything. So, time to try at least partially automating the whole process.

![Endomondo to Strava]({{ site.url }}/images/2020-12-13-strava/endo2strava.png){: .align-center}

Before starting let’s see all the unfortunate caveats – Strava API in free mode has:

* A limit of 100 requests per 15 minutes
* A limit of 1000 requests per 24 hours (resets at midnight UTC)
* OAuth 2.0 access token, that you need to manually renew after reaching every limit including the 100 requests per 15 minutes one (I don’t know if it applies also to paid version)

So it is not going to be a smooth experience, but still I think it is worth a try.
The prerequisites are:

* Strava account
* Data from Endomondo unpacked in some location (in other words, a bunch of TCX files that you want to import)
* Optional if you want to play with source code: Basic knowledge of C# + Visual Studio or Visual Studio Code

The first step is to register an application with Strava API. Thankfully, this is a quick and nice process:
## 1)	Go to [https://www.strava.com/settings/api](https://www.strava.com/settings/api)
## 2)	Fill in the blanks

![Strava - create an app]({{ site.url }}/images/2020-12-13-strava/api1.png){: .align-center}

* Application Name – whatever
* Category – choose „_Data Importer_”
* Website – whatever, just ensure it is a valid URL address
* Authorization Callback Domain: “_localhost_”

## 3)	Next,  you need to provide an image – again, this is just to bypass the screen, so choose whatever you want. 

![Strava - create an app2]({{ site.url }}/images/2020-12-13-strava/api2.png){: .align-center}

## 4)	And that’s all. You should see a  screen similar to the one below:

![Strava - create an app3]({{ site.url }}/images/2020-12-13-strava/api3.png){: .align-center}

**Important!** The values for `ClientID` and `ClientSecret` will be used in the rest of this tutorial, so please keep these available. To see the `ClientSecret`, you need to click on the “_show_” link next to it.
{: .notice--danger}
Take note of two graphs: _Daily requests_ and _Requests every 15 minutes_. These will be useful as it is the only viable way to track how close you are to Strava API's limits.

When it comes to my application I provide both the [source code](https://github.com/konradzaba/endomondo-to-strava) as well as [ executable](https://github.com/konradzaba/endomondo-to-strava/releases/download/v1.1/Release_ver1_1.7z). If you don’t know a thing about programming, head for the executable.
At the first start, the application will prompt for the `ClientID`, `ClientSecret` and path to the folder with _TCX_ files. These values will be saved in a config file, so with the next run you won’t need to provide these. Both the `ClientID` and `ClientSecret` were mentioned before and you can get them from [Strava website](https://www.strava.com/settings/api).

With each start, you need to provide an _authentication code_. The application will open automatically your web browser and connect to the following address _https://www.strava.com/oauth/mobile/authorize?client_id=ClientId&redirect_uri=http%3A%2F%2Flocalhost&response_type=code&approval_prompt=auto&scope=activity%3Awrite%2Cread&state=test_

Note that the URL has the `ClientId` value that you provided previously. After a second or two, the web browser will display an error saying that you cannot connect to localhost – and **this is correct**! That’s what you wanted to see. The URL will change to a value similar to this one:

![Strava - create an app4]({{ site.url }}/images/2020-12-13-strava/api4.png){: .align-center}

And it has the authentication code that you are looking for – it is this part:

![Strava - create an app5]({{ site.url }}/images/2020-12-13-strava/api5.png){: .align-center}

Please copy it and provide in the prompt asking for the authentication code.

![Strava - create an app6]({{ site.url }}/images/2020-12-13-strava/api6.png){: .align-center}

And that’s it, you’re done! 
The application should work correctly, just remember about the usage limits for Strava API. If nothing is happening or files stopped being uploaded, most probably you just reached the free API limits. You can check this by looking at graphs visible on [Strava website](https://www.strava.com/settings/api). Take a shorter (if you hit 100 requests per 15 minutes limit) or longer (in case of 1000 requests daily limit) break and run the app again.

Additionally, one thing I noticed – unfortunately, some data from Endomondo is malformed – the application returns errors when trying to upload this data. I gathered all those files and tried to add them via Strava UI with the following result:

![Strava - create an app7]({{ site.url }}/images/2020-12-13-strava/api7.png){: .align-center}

So it seems, these are just duplicates that can be safely omitted – I just deleted them manually from the folder with TCX files.
Hopefully my code and application helps you a bit!

This post was inspired by [the article](https://medium.com/@kamil.burczyk/exporting-your-activities-from-endomondo-to-strava-682c23391041).

Update: Added new release with 15 minutes autoretry functionality. Not tested too much though, as all my activities are now in Strava :)

![Strava - results]({{ site.url }}/images/2020-12-13-strava/stravaFinal.png){: .align-center}

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FEndomondo-to-Strava-transferring-workouts%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)