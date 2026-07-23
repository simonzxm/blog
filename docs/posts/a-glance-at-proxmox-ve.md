---
date: 2026-04-03
categories: [Review, Linux]
slug: a-glance-at-proxmox-ve
cover: ../assets/covers/a-glance-at-proxmox-ve.png
---

# A glance at Proxmox VE

由于某些原因我获得了一台独服（Dedicated Server），那我正好来试试早有耳闻的 PVE 吧。

感觉这界面跟飞机仪表盘一样（x

<!-- more -->

## 我为什么要尝试 PVE

其实是突然有了两三个小项目，我想把他们部署在服务器上，又想把环境隔离开。
众所周知 KVM 里面是能装 Docker 的，我就正好想试一下。

那有人可能要问了，为什么不直接多搞几个 Docker Compose 呢？
~~我也不知道，我编不下去了。。~~

## 初装 PVE

这台服务器有两块盘，设计应该是正好组个 RAID 1，于是便稀里糊涂分了个区。

|File system|Mount point|RAID|Usable size|Space used|
|---|---|---|---|---|
|ext4|/boot|1|1.0 GiB|2.0 GiB|
|ext4|/|1|40 GiB|80 GiB|
|swap|swap|-|2 x 1.0 GiB|2.0 GiB|
|ext4|/var/lib/vz|1|160 GiB|320 GiB|

其实这个配置是比较接近服务商的推荐配置的，不过我也不太理解为什么开这么小的 swap，
查了半天说是可以通过 swap 看负载咋样。感觉挺牵强的，但我也没管了。~~反正不是我的盘。~~

装完了以后就出现了一堆奇奇怪怪的事情，先是我一打开 WebUI 他就说不安全，导致垃圾 Chrome 不让我记住密码，
好吧我也能理解。所以我就先 SSH 上去装了个 Caddy，直接反代，然后就清爽多了。
（哦，这里还需要去设置一下 rDNS，~~那要不做个邮局正好~~）

```nginx
pve.example.com {
	reverse_proxy https://127.0.0.1:8006 {
		transport http {
			tls_insecure_skip_verify
		}
	}
}
```

不过这个打开也挺诡异的，一上来就一个弹窗吓我一跳，这个 PVE 还要收费的吗。

> You do not have a valid subscription for this server. Please visit www.proxmox.com to get a list of available options.

查了半天发现是仓库收费，这太神秘了。按照网上的教程改了半天，最后我也没有解决掉这个弹窗。开摆了。

## 配置网络

新建虚拟机倒不是特别复杂，对着教程一步步来就行，倒是我一装好就遇到了网络问题。
这里的虚拟机的网络居然全都要自己配，吓哭了。

一般的话会用 NAT 的形式让虚拟机能访问外网，这里需要自己创建一个局域网

```bash
vim /etc/network/interfaces.d/vmbr1
ifup vmbr1
```

其中写入

```bash
auto vmbr1
iface vmbr1 inet static
    address 10.0.0.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0
    post-up   echo 1 > /proc/sys/net/ipv4/ip_forward
    post-up   iptables -t nat -A POSTROUTING -s '10.0.0.0/24' -o vmbr0 -j MASQUERADE
    post-down iptables -t nat -D POSTROUTING -s '10.0.0.0/24' -o vmbr0 -j MASQUERADE
```

再改虚拟机里的配置 `/etc/network/interfaces`

```bash
auto lo
iface lo inet loopback

allow-hotplug ens18
iface ens18 inet static
    address 10.0.0.2/24
    gateway 10.0.0.1
    dns-nameservers 8.8.8.8 1.1.1.1
```

```bash
systemctl restart networking
```

结果还是连不上网，一怒之下我怒了一下，把防火墙全关了，结果还是没用，不得不寻求 AI 的帮助。
他跟我说我网卡选错了，但我在 WebUI 里面怎么也改不了，最后非常难绷的把配置文件打开改了..

```bash
vim /etc/pve/qemu-server/100.conf
```

手动把 `vmbr0` 改成 `vmbr1`，然后强制关机，重新开机后网络就正常了，太神秘了这个

## 做一个网关 LXC

不过现在就会遇到一个糟糕的问题，我要怎么让内网的服务都能被外网访问呢，那肯定是个人都知道我要反代出来，
直接在宿主机上装 Nginx/Caddy 对吧。可以，但我还是秉持了这个分工明确的原则，非常迫切的想把他们拆开，
~~把简单的问题复杂化，以此满足我折腾的欲望。~~所以最终我选择专门拿一个 LXC 来放 Caddy 网关。

那么该做什么也就很明了了，我们直接把 80 和 443 都完全绑到网关去

```bash
auto vmbr1
iface vmbr1 inet static
    address 10.0.0.1/24
    bridge-ports none
    bridge-stp off
    bridge-fd 0
    post-up echo 1 > /proc/sys/net/ipv4/ip_forward
    post-up iptables -t nat -A POSTROUTING -s '10.0.0.0/24' -o vmbr0 -j MASQUERADE
    post-up iptables -t nat -A PREROUTING -i vmbr0 -p tcp --dport 80 -j DNAT --to-destination 10.0.0.2:80
    post-up iptables -t nat -A PREROUTING -i vmbr0 -p tcp --dport 443 -j DNAT --to-destination 10.0.0.2:443
    post-down iptables -t nat -D POSTROUTING -s '10.0.0.0/24' -o vmbr0 -j MASQUERADE
    post-down iptables -t nat -D PREROUTING -i vmbr0 -p tcp --dport 80 -j DNAT --to-destination 10.0.0.2:80
    post-down iptables -t nat -D PREROUTING -i vmbr0 -p tcp --dport 443 -j DNAT --to-destination 10.0.0.2:443
```

然后就可以愉快的写 Caddy 了

```nginx
pve.example.com {
	reverse_proxy https://10.0.0.1:8006 {
		transport http {
			tls_insecure_skip_verify
		}
	}
}
app.example.com {
    reverse_proxy http://10.0.0.3:8080
}
```

## 后记

最后跑的项目也没啥人用，服务器也正好过期了，对 PVE 的初体验也算是结束了。不得不说这个 PVE 和 Arch 挺像的，
不知道是不是我的操作问题，都有一大堆需要自己完成的东西。你可以想象我对着那个难用的 VNC 窗口敲了好久，还是在火车上..

下次不用这个了，如果有下次的话。我可能会试试 Incus 吧。
