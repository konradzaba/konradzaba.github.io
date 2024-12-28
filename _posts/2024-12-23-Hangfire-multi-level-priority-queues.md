---
title: "Hangfire with multi level priority queues"
date: 2024-12-23 22:00:00 +0100
classes: wide
header:
  image: assets/images/default-header.png
categories:
  - blog
  - tech
tags:
  - c#
  - net
  - queues
---

Hangfire is a great library, primarily used for scheduling background tasks in .NET environments. What most people overlook is that it’s not just a CRON job engine; it’s also a powerful mechanism for managing queues with persistence. In scenarios where you don’t need PUB-SUB queues like RabbitMQ, Hangfire is the perfect simple solution.

However, this post isn’t about why Hangfire is amazing—if you’ve stumbled upon this post without prior knowledge of Hangfire, check out this excellent video by Nick Chapsas.

<iframe width="560" height="315" src="https://www.youtube.com/embed/4wURs-67mB0?si=QGBWDkua10U0K7xj" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>

Recently, I faced a challenge when trying to create multi-level priority queues. Hangfire natively supports single-level priority queues, e.g., {"alpha", "beta", "default"}—workers will fetch jobs from the alpha queue first, beta second, and then from the default queue.

```c#
var options = new BackgroundJobServerOptions
{
    Queues = new[] { "alpha", "beta", "default" }
};
```
Now, imagine a scenario where you have multiple specific job consumers—let’s call them "Consumer1" and "Consumer2". Assume these two consumers are completely independent and execute different types of jobs. In this case, each consumer should process jobs with two priorities: "low" and "high." Here’s the problem—you can’t create the following queue definition:

```c#
var options = new BackgroundJobServerOptions
{
    Queues = new[] { "consumer1-high", "consumer2-high", "consumer1-low", "consumer2-low" }
};
```

This setup would cause Consumer2 to have a lower priority queue than Consumer1, meaning tasks assigned to Consumer2 could remain in the queue, waiting for execution until Consumer1 finishes processing its tasks.

The trick is to run multiple instances of Hangfire. While that might sound intimidating, it's actually quite simple in practice. First, we need to create two `BackgroundJobServerOptions` objects for each Hangfire server instance:

```c#
// Configure Hangfire to use In-memory storage
GlobalConfiguration.Configuration.UseInMemoryStorage();

// Configure two Hangfire server instances with different queues
var server1Options = new BackgroundJobServerOptions
{
    ServerName = Settings.Server1Name,
    Queues = ["high-queue-server-1", "low-queue-server-1"],
    WorkerCount = Settings.Server1WorkerCount
};

var server2Options = new BackgroundJobServerOptions
{
    ServerName = Settings.Server2Name,
    Queues = ["high-queue-server-2", "low-queue-server-2"],
    WorkerCount = Settings.Server2WorkerCount
};
```

Afterward, we just need to start the servers—in a console application, it’s as simple as this:
```c#
using var server1 = new BackgroundJobServer(server1Options);
using var server2 = new BackgroundJobServer(server2Options);
```
Depending on the queue name, Hangfire will automatically enqueue a job on the specific server instance. The queue order defined for each server determines the priority.

```c#
BackgroundJob.Enqueue("high-queue-server-1", () => Thread.Sleep(10000));
```

I’ve prepared a code sample that includes both the simplest console application showcasing this functionality, as well as a version with the Hangfire dashboard enabled, where everything can be neatly displayed.

![Hangfire dashboard - queues]({{ site.url }}/images\2024-23-12-hangfire/dashboard.png){: .align-center}


![Hangfire dashboard - enqueued jobs]({{ site.url }}/images\2024-23-12-hangfire/queues.png){: .align-center}

You can find this code sample on my [GitHub Page](https://github.com/konradzaba/HangfireMultilevelQueues):

<!-- https://lab.lepture.com/github-cards/#konradzaba/HangfireMultilevelQueues|default -->
<div class="github-card" data-github="konradzaba/HangfireMultilevelQueues" data-width="400" data-height="" data-theme="default"></div>
<script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"></script>

[![Hits](https://hits.seeyoufarm.com/api/count/incr/badge.svg?url=https%3A%2F%2Fkonradzaba.github.io%2Fblog%2Ftech%2FHangfire-multi-level-priority-queues/%2F&count_bg=%2379C83D&title_bg=%23555555&icon=&icon_color=%23E7E7E7&title=hits&edge_flat=false)](https://hits.seeyoufarm.com)