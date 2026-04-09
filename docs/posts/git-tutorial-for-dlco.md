---
date: 2026-04-09
categories: [DLCO, Guide]
slug: git-tutorial-for-dlco
---

# Git tutorial for DLCO

在此简述如何在实验平台中配置网络连接，并与 NJU Git 同步。

<!-- more -->

## 连接网络

实验平台没有开 DHCP，也没有配置 DNS，需要我们自己配置。

打开 `/etc/resolv.conf` 然后写入校内 DNS 即可：

```bash
vim /etc/resolv.conf
```

```
nameserver 10.12.254.3
nameserver 10.28.254.3
```

或者也可以使用 `echo`

```bash
echo nameserver 10.12.254.3 >> /etc/resolv.conf
echo nameserver 10.28.254.3 >> /etc/resolv.conf
```

然后我们就能连上校园网了。如果需要访问校外网，只需要在浏览器中打开 `p.nju.edu.cn` 然后登陆就行。

---

## 配置 Git

这里为了方便，我们使用 [NJU Git](https://git.nju.edu.cn/)

首先在 NJU Git 创建一个仓库，假设名字叫 `dlco`。我们后续的操作都会在这个仓库进行。

接下来我建议通过 SSH 进行提交，这样会较为方便。

### 配置 SSH Key

在实验平台的终端输入 `ssh-keygen`，一路回车，然后把自己的公钥复制出来：

```bash
cat /etc/.ssh/id_rsa.pub
```

会得到一串公钥，大概像 `id_rsa xxxx...xxxx root@coder`，通过平台的复制功能拿出来，然后[在这里](https://git.nju.edu.cn/-/user_settings/ssh_keys)添加 SSH Key。

### 配置 Git 仓库

回到我们的作业目录

```bash
cd /data/workspace/myshixun
```

添加远程仓库（这里的 `nju` 可以换成其他你想要的名字，`your-username` 记得填你自己的）

```bash
git remote add nju git@git.nju.edu.cn:your-username/dlco.git
```

注意到这里如果你直接 `git push nju master` 会因为本地没有完整的提交历史，并且你也无法 `git fetch`，所以我们直接提交是不行的，可以使用替代方法。

先创建一个新的分支

```bash
git checkout --orphan nju
```

然后进行第一次提交

```bash
git add .
git commit -m "Sync"
```

这个分支的提交历史就是完整的了，我们可以直接提交到 NJU Git 上面

```bash
git push nju sync:sync
```

接下来建议切回 `master` 分支，因为当你在非 `master` 分支进行评测时，会导致仓库出现异常

```bash
git checkout master
```

如果需要从 NJU Git 同步文件

```bash
git pull nju sync:sync
git checkout sync -- .
git add .
git commit -m "Sync"
```

如果需要将新的文件提交到 NJU Git

```bash
git checkout sync
git checkout master -- .
git add .
git commit -m "Sync"
git push nju sync:sync
```

!!! warning
    进行所有修改后，一定要切回 `master` 分支，否则评测时仓库可能出现异常

    ```bash
    git checkout master
    ```
