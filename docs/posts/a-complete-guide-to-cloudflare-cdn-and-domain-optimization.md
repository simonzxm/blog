---
date: 2026-07-23
categories: [Guide, Web]
slug: a-complete-guide-to-cloudflare-cdn-and-domain-optimization
cover: ../assets/covers/a-complete-guide-to-cloudflare-cdn-and-domain-optimization.png
---

# A complete guide to Cloudflare CDN and domain optimization

本教程将介绍如何使用 Cloudflare CDN 和优选域名来加速站点的访问。

<!-- more -->

## 核心原理与准备工作

当不进行优选的时候，Cloudflare 对应的域名会解析到不知道什么地方，一般是欧美；
这样的结果就是，你在访问的时候，会有很高的延迟，并且很多时候速度也很糟糕，最后体验会很差。
优选实际上做的就是，他把你的域名解析到一个对大陆网络通畅的地方，比如日本、香港、新加坡，
随后你在访问的时候延迟和速度都会有所改善，一般电信移动可以达到 70ms 左右，联通比较可惜，
一般最低也就 170ms 了，不过也可以比默认解析到的要稳定和快很多。

为什么可以这么做？其实这就是 CDN 的原理所在，他会通过分地域解析，来让你访问到对你最快的节点
（在中国大陆不是），然后把你的的请求通过他们自己的高速网络传输到原服务器（回源），这样就快了很多；
如果是 Cloudflare Workers 或 Pages，那就更好了，你的请求会直接在边缘节点上被处理，
不用再回源到你可能的美国服务器上，那么网站的访问就会快很多。

以上就是优选的大致原理。在开始之前，我们先确定一下这两个先决条件，需要提前做好准备。

首先是，你最好有两个域名，一个托管在 Cloudflare，另一个托管在国内云平台，比如阿里云等；
不过如果没有两个，也有一些折中措施，这个会在后面提到。其次，最好你需要有一张银行卡，
虚拟银行卡也行，需要开通一下自定义主机名的服务，不然就只能对 Pages 进行优选。

如果已经准备好了，那我们应该已经完成大半了。

## 配置优选域名

这里我使用 <https://saas.sin.fan/> 提供的。当然你不满意可以在 [这里](https://cf.090227.xyz/)
随便找一个你看着顺眼的，应该都差不多。

现在我假设你在 Cloudflare 有一个域名 `a.com`，在阿里云可能有一个域名叫 `b.com`，
然后我们分开讨论你是否有 `b.com` 的情况。

如果你有 `b.com` 的话，那么 `b.com` 就是最后给人看和访问的域名，而 `a.com` 则是在 Cloudflare
负责实施优选等的域名，那么这个时候你可以像我一样选择数字 `.xyz` 这种廉价的域名放在 Cloudflare。
那么你需要做的就是，在 Cloudflare 放一个占位的域名，或者说回退源，比如 `fallback.a.com`，
这个可以解析到任何东西，反正只要有就行了；然后在阿里云等设置你需要使用的域名，比如 `app.b.com`，
进行分线路的解析：

|主机记录|记录类型|解析请求来源|记录值|
|---|---|---|---|
|app|CNAME|中国地区|fallback.a.com|
|app|CNAME|境外|saas.sin.fan|

如果没有 `b.com` 的话，我们需要让你的 `a.com` 的一部分被阿里云等解析，假设为 `app.a.com`，
则需要在阿里云添加 `app.a.com` 这个域名，按照给出的要求，在 Cloudflare 配置 TXT 记录和 NS 记录，
验证完了可以把 TXT 记录删掉；接下来，按照如下设置配置，其中 `@` 表示主域名 `app.a.com`。

|主机记录|记录类型|解析请求来源|记录值|
|---|---|---|---|
|@|CNAME|中国地区|fallback.a.com|
|@|CNAME|境外|saas.sin.fan|

配置完了解析以后，如果你不只想对 Pages 进行优选，就需要绑定银行卡，在
[自定义主机名](https://dash.cloudflare.com/?to=/:account/:zone/ssl-tls/custom-hostnames)
选择免费模式即可，然后在回退源填写 `fallback.a.com`。接下来，我们需要添加自定义主机名，
填写供他人访问的域名，证书验证方法两个都可以，如果选 TXT 验证的话需要再在阿里云那边加一下 TXT 记录就行。
最后，你的回退源、证书和主机名的状态应该都是有效，那就没有问题了。

??? info "TXT 和 HTTP 验证的区别"

    我认为 TXT 会安全一点，因为还需要你添加 TXT 记录；而 HTTP 就比较方面，不需要再做其他操作就可以自动验证好。

    具体的区别，你可以在
    [Cloudflare 官方文档](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/security/certificate-management/issue-and-validate/validate-certificates/)
    里面得到有关的信息。

那么经过上述步骤，差不多就配置好优选域名了，接下来就很简单了。

## 接入具体服务

### 接入自己的服务器

如果你有自己的服务器，那么在 Cloudflare 添加一个到你服务器的解析（假设 IP 为 1.1.1.1）

|名称|类型|内容|代理状态|
|---|---|---|---|
|app.a.com|A|1.1.1.1|已代理|

接下来在自定义主机名的地方把源服务器改成 `app.a.com` 即可。

### 接入 Cloudflare Workers

如果你要在网页操作的话，直接在“域”里面添加一个路由，区域选 `a.com`，路由模式填 `app.b.com/*`
即可，不需要再做其他操作。对于 Wrangler，如下配置 route 即可

=== "wrangler.jsonc"

    ```json
    "route": {
        "pattern": "app.b.com/*",
        "zone_name": "a.com",
    },
    ```

=== "wrangler.toml"

    ```toml
    [route]
    pattern = "app.b.com/*"
    zone_name = "a.com"
    ```

### 接入 Cloudflare Pages

直接在“自定义域”里面添加你的 `app.b.com` 即可，不需要其他设置，也不需要自定义主机名，比较方便。
