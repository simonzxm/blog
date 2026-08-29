---
date: 2026-08-29
categories: [Linux]
slug: listen-to-apple-music-lossless-on-archlinux
---

# Listen to Apple Music Lossless on Archlinux

Apple Music 只支持 Windows 和 macOS，哎这苹果太坏了。能不能支持一下 Linux

<!-- more -->

近来找到了一个似乎可行的解决方案，大概是 2026.2 左右的时间，他甚至可以让你接小尾巴（DAC）的时候可以自动切解析度，那我肯定要来试一下（

我用的是 Archlinux，其他发行版大概率也没问题

来源 <https://www.reddit.com/r/waydroid/comments/1rszorj/waydroid_highres_audio_fix_and_apple_music_fix/>

补丁 <https://drive.google.com/drive/folders/1YsdesaHC1sWbwhXJYwSZ-sa-TKyon1Je>

他大概的实现就是，破解掉 Waydroid 的固定采样率，让 Apple Music 的输出可以直通小尾巴。

## 安装 Waydroid


```bash
sudo pacman -S waydroid
```

这里我镜像用的是 [WayDroid-ATV](https://github.com/WayDroid-ATV/waydroid-builds/releases/tag/20260106)
的 Android 13（`lineage-20.0-20260106-UNOFFICIAL-waydroid_x86_64.zip`）。
把里面的 `system.img` 和 `vendor.img` 丢到 `/etc/waydroid-extra/images/`，然后：

```bash
sudo waydroid init -f
```

再把上面下载到的补丁给复制到对应目录

```text
/var/lib/waydroid/overlay/system/lib64/libaudioflinger.so
/var/lib/waydroid/overlay/vendor/lib/hw/audio.primary.waydroid.so
/var/lib/waydroid/overlay/vendor/etc/audio_policy_configuration.xml
```

Waydroid 默认提供的网络是数据的形式，如果你想让 Apple Music 把它当成 Wi-Fi，
可以在 `/var/lib/waydroid/waydroid_base.prop` 里加上

```ini
persist.waydroid.fake_wifi=com.apple.android.music
```

然后把容器拉起来：

```bash
sudo systemctl enable --now waydroid-container.service
```

我安装的镜像没有 Play Store，所以我用了 [apkeep](https://github.com/EFForg/apkeep/releases/tag/1.0.0)
下载了 Apple Music 5.2.1（这个应该是和社区当时使用的版本比较接近，当然可能新版也可以，我还没试过）。

装完要看一下他的 UID，并把他写进补丁需要的文件里（我这边是 `10125`，不同设备可能不一样）

```bash
sudo waydroid shell -- dumpsys package com.apple.android.music | grep userId
sudo waydroid shell -- sh -c 'echo 10125 > /data/local/tmp/apple_music_uid.txt'
```

这个补丁怎么用了这么随意的一个路径，太糟糕了。

## 配置 PipeWire

这里需要让 PipeWire 可以自动切采样率

```ini
# ~/.config/pipewire/pipewire.conf.d/10-hires-rates.conf
context.properties = {
    default.clock.rate = 48000
    default.clock.allowed-rates = [ 44100 48000 88200 96000 176400 192000 352800 384000 ]
}
```

```bash
systemctl --user restart pipewire.service pipewire-pulse.service wireplumber.service
```

理论上这一步就结束了，不过我当时在做的时候，似乎被某些软件的静音流影响了，
导致 Waydroid 输出的已经是 96kHz 了，但最后给小尾巴的还是 48kHz的。

这里可以给 Waydroid 加一条配置，让它 active 的时候按自己的 `node.rate` 切

```ini
# ~/.config/pipewire/pipewire-pulse.conf.d/90-hires-routing.conf
pulse.rules = [
  {
    matches = [
      { application.name = "Waydroid" }
    ]
    actions = {
      update-props = {
        node.force-rate = 0
      }
    }
  }
]
```

那么就成功啦。

可能过些时候我尝试自己重写一下这个补丁，因为原作者好像没有开源；或者我也可以尝试一下打包，这样安装会更方便一些。
