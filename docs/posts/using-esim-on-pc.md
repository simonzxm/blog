---
date: 2026-10-19
categories: [Linux, Hardware]
slug: using-esim-on-pc
---

# Using eSIM on PC

手机的两个卡槽很早就满了（一张电话卡一张流量卡），于是我的一个境外 SIM 卡直接没地方插了（后来这个卡直接死掉了，但我还想换一个新的）

最近突然发现了一个项目 [VoCat](https://github.com/MengMengCode/VoCat)，他可以在电脑上插卡接短信，不过需要有一个 4G 模块。所以我就火速购入了一个移动热点（俗称高通 410 棒子）和一张小白卡（eUICC），给这个棒子刷了 OpenStick v1 Debian 11，然后直接在棒子上装 VoCat 就可以爽用了（

感谢 Cursor Grok 4.7 帮我完成了几乎所有操作，他浪费了我大量时间（x

!!! info
    我这里的型号是 ufi001c，如果型号不一样，那么以下内容可能未必能用

## 刷机

### 选择合适的系统

VoCat 的 VoWiFi / IMS 隧道功能严重依赖 Linux 内核原生的 XFRM，而目前社区较新的 410 固件似乎大多精简掉了这些网络特性（反正我没找到）

而在旧版中，[OpenStick v1](https://github.com/OpenStick/OpenStick/releases/tag/v1) 的 Debian 11 完整开启了这些支持，所以只好委屈一下用比较旧的版本了。

### 备份和分区

长按实体按键插入电脑，让棒子进入 9008 模式，然后把整个棒子备份一下，如果没备份那恭喜你可以买根新的了。（或者只备份部分也可以，不过其实加起来也没多大）

接下来根据备份重做一下分区表，尽量照着原厂的不要变，免得出问题。不过有一个需要修改的是，上面用的 OpenStick v1 的 `boot-ufi001c.img` 的内核命令行硬编码了根分区的 `PARTUUID`

```
earlycon root=PARTUUID=a7ab80e8-e9d1-e8cd-f157-93f69b1d141e console=ttyMSM0,115200 no_framebuffer=true rw
```

所以记得 uuid 需要手动写一下就行。

### 更改默认 SIM 走线

棒子硬件上一般会默认把 SIM 走线连向板载 eSIM ，外部卡槽默认不连通，而我们要用外部卡槽，所以需要把 GPIO 的电平改一下。

具体来说，把 MSM8916 的 `GPIO 2`（`sim:sel`）和 `GPIO 1`（`sim:en`）改成高电平，另外的 `GPIO 0` 与 `GPIO 3` 低电平就行了。

这里需要改 `boot-ufi001c.img`，比较麻烦，建议让 AI 帮忙。

## 刷入系统

准备好修改后的 boot 镜像后，在 9008 模式下依次刷入引导文件、boot 镜像、Debian 根文件系统，并将之前备份的基带校准分区原样写回。

启动之后，可能会发现镜像的固件与棒子的基带不太匹配，需要再掏出之前备份的 `modem.bin`，替换一下对应的固件。

## 部署 VoCat

登录棒子后，先做一下准备工作

1. **停用 ModemManager**：直接 `systemctl disable --now ModemManager` 即可。
2. **卡槽软复位服务**：有时候卡的状态会卡住，建议开机后重新做一次卡槽的通断电，写一个 oneshot 服务每次开机跑一下即可
   ```bash
   qmicli -d /dev/wwan0qmi0 --device-open-proxy --uim-sim-power-off=1
   sleep 1
   qmicli -d /dev/wwan0qmi0 --device-open-proxy --uim-sim-power-on=1
   ```
   将其写为一个开机 oneshot 服务。执行后通过 `qmicli --uim-get-card-status` 查看，卡状态会顺利变为 `present`，串口执行 `AT+CPIN?` 也会返回 `READY`。

最后直接运行 VoCat 的官方脚本安装即可，访问棒子的 `:7575` 端口就可以看到 WebUI 了。

## 主机网络处理

我当时装完以后宿主机的网络就出问题了，建议是让宿主机这边只给一个 `/24` 路由到棒子，其他的都走默认路由。

在主机的 NetworkManager 中，把该连接属性改成 `ipv4.never-default yes` 和 `ipv4.ignore-auto-dns yes` 即可。

另外最好在宿主机开启 `net.ipv4.ip_forward = 1`，给棒子做一下 NAT，同时在棒子上把默认网关改成宿主机，这样会方便一些。

## 后记

不知道我是买了残次品还是什么，总感觉我这个用的很难受，WebUI 和信号都有种断断续续的感觉。去某论坛问了一下说是正常现象，也不知道该说什么好了。

刷系统还是太麻烦了，如果要开箱即用的话建议还是买个便宜的移远 4G 模块（比如 EC20 CEFAG），直接在宿主机安装 VoCat 就行，并且可以同时连好几个，不用这么折腾自己。

以后我估计也会换掉了，这个真的不好用感觉，太不稳定了。
