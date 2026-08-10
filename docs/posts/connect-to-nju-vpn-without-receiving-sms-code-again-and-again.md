---
date: 2026-08-11
categories: [Guide]
slug: connect-to-nju-vpn-without-receiving-sms-code-again-and-again
---

# Connect to NJU VPN without receiving SMS code again and again

项目地址：<https://github.com/simonzxm/nju-connect>

<!-- more -->

给 [ZJU Connect](https://github.com/Mythologyli/zju-connect) 套了个壳，或者说壳都懒得套了。

方便一下自己，我不想接短信验证码。。

```bash
./nju-connect.sh          # 首次运行自动下载客户端；连接（首次登录输一次短信验证码）
./nju-connect.sh trust    # 绑定授信终端 → 之后登录免短信
```

非常简单吧。我也懒得加更多功能了，建议直接扔 Mihomo 里面做分流
