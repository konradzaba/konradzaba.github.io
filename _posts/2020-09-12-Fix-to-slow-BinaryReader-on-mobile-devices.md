---
title: "Fix to slow BinaryReader on mobile devices"
date: 2020-09-12 13:33:00 +0100
categories:
  - blog
  - tech
tags:
  - vorn
  - gamedev
  - xamarin
  - c#
---

When working on [Vorn's Adventure](https://play.google.com/store/apps/details?id=com.konradzaba.VornsAdventure) in Xamarin.Android, I noticed a severe slowdown when using BinaryReader to read byte by byte a certain file with animated model. It came by surprise, hence why I share this in a post.

```c#
private AssetManager _assetManager;

private void Test(string filePath)
{
	using (var stream = _assetManager.Open(filePath))
	{
		PerformBinaryReading(stream);
	}
}

private void PerformBinaryReading(Stream fs)
{
	BinaryReader br = new BinaryReader(fs);
	//...
}
```

The binary file itself was relatively small (3MB) and on my PC it took around a single second to read it, while [on a quite decent](https://www.gsmarena.com/sony_xperia_xa1-8596.php) (spec-wise) Android phone it took a whooping **17** seconds.

First, let's think why it happended. When we are using a BinaryReader and doing a lot of seeking back and forth in the bytes, the file is continuously accessed (locked and unlocked) from the storage. For a modern PC equipped with fast Ryzen CPU and NVMe SSD this is not a big deal, but for a mobile device this is real problem.

The trick to solve this problem is to read quickly the whole file into RAM in a single burst and then use the BinaryReader without any changes, so this does not involve to much work codewise.  To do so, read the file into a byte array and then pass this byte array to the MemoryStream.

```c#
private AssetManager _assetManager;

public byte[] GetFileBytes(string filePath)
{
	var bytes = default(byte[]);
	using (StreamReader reader = new StreamReader(_assetManager.Open(filePath)))
	{
		using (var memstream = new MemoryStream())
		{
			reader.BaseStream.CopyTo(memstream);
			bytes = memstream.ToArray();
		}
	}
	return bytes;
}

private void Test(string filePath)
{
	byte[] fileContents = GetFileBytes(filePath);

	using (MemoryStream stream = new MemoryStream(fileContents))
	{
		PerformBinaryReading(stream);
	}
}

private void PerformBinaryReading(Stream fs)
{
	BinaryReader br = new BinaryReader(fs);
	//...
}
```
What happended is I read all the bytes to memory. Then, I created a MemoryStream with these bytes and BinaryReader instance to read bytes from the MemoryStream (essentially RAM).
And as a result in my case, the performance on mobile device improved from 17 seconds to around 2 seconds.