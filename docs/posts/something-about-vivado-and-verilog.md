---
date: 2026-03-26
categories: [Studying, DLCO]
slug: something-about-vivado-and-verilog
---

# Something about Vivado and Verilog

!!! info
    课程名称：数字逻辑与计算机组成实验

    开发板：Nexys A7-100T

    项目仓库：<https://github.com/simonzxm/dlco-exp>

<!-- more -->

## 环境配置

由于 Vivado 过于大了（100G+）且没有 Mac 版，我不得不仅在寝室的电脑安装了。

Vivado 是一个包含 GUI 的 IDE，但是我自己感觉非常难用，界面复杂而丑陋，并且远程也不是很好的方案。

所以在此我分享一下我使用的环境配置。

### 在 Mac 上配置 Icarus Verilog 和 GTKWave
主要是，你不可能一直到其他地方去跑这个程序来验证正确性，所以我们需要一个能编译的东西，他可以帮你验证程序是否能编译，部分帮你判断程序是否正确。

```bash
brew install icarus-verilog
```

接下来安装 GTKWave，这个是通过看波形图来判断程序的输出是否正确。（不过我还不太会怎么看这个）

可以直接在 repo 看到安装教程：[https://github.com/gtkwave/gtkwave](https://github.com/gtkwave/gtkwave)

由于 Mac 的接口很少，并且也没法装大型的软件用于烧录，我们接下来在另一台电脑上配置好 Vivado。

### 在 ArchLinux 上配置 Vivado

首先下载`.tar.gz`的安装包，解压在某个位置。

我安装的是 2020.2 版本（课程推荐版本），可能需要进行一些环境的调整。

```bash
sudo pacman -S libxcrypt-compat
```

然后，建议使用批处理而非 GUI 安装。

首先生成配置文件

```bash
./xsetup -b ConfigGen
```

编辑配置文件`~/.Xilinx/install_config.txt`后，直接在命令行安装

```bash
sudo ./xsetup --agree 3rdPartyEULA,WebTalkTerms,XilinxEULA --batch Install --config ~/.Xilinx/install_config.txt
```

我第一次使用 GUI 安装的时候卡住了，后来也不知道出现了什么问题，最好只好全部重新安装。

如果使用批处理安装的话，至少可以知道问题出现在哪里了。

安装成功后需要先安装驱动：

```bash
# 进入你安装目录下的驱动文件夹（根据你的实际路径修改）
cd /opt/Xilinx/Vivado/2020.2/data/xicom/cable_drivers/lin64/install_script/install_drivers/

# 以 root 权限运行驱动安装脚本
sudo ./install_drivers
```

然后需要在`.bashrc`或者`.bash_profile`加一个`source`

```bash
echo 'source /opt/Xilinx/Vivado/2020.2/settings64.sh' >> ~/.bashrc
```

接下来可以打开试试了。

如果打开后显示为全白窗口，可以在打开前

```bash
export _JAVA_AWT_WM_NONREPARENTING=1
```

当然，这个也可以加在你的`.bashrc`里面。

## 通过 Make 进行编译和烧录

可以直接抄我的 Makefile（

/// details | Makefile
    type: plain
```makefile
VIVADO = vivado -mode batch -source
TCL_SCRIPT = run.tcl
BITSTREAM = ./build/top.bit

all: $(BITSTREAM)

$(BITSTREAM): ./*.v ./*.xdc $(TCL_SCRIPT)
	mkdir -p build
	$(VIVADO) $(TCL_SCRIPT)

prog: $(BITSTREAM)
	$(VIVADO) download.tcl

clean:
	rm -rf build/ .Xil/ *.log *.jou *.html *.xml 

.PHONY: all prog clean
```
///

然后需要新建两个`.tcl`文件

/// details | run.tcl
    type: plain
```tcl
set PART xc7a100tcsg324-1
set BUILD_DIR ./build

read_verilog [glob ./*.v]
read_xdc [glob ./*.xdc]

synth_design -top top -part $PART
opt_design
place_design
route_design

write_bitstream -force $BUILD_DIR/top.bit
```
///

/// details | download.tcl
    type: plain
```tcl
open_hw_manager
connect_hw_server
open_hw_target
set device [lindex [get_hw_devices] 0]
set_property PROGRAM.FILE {./build/top.bit} $device
program_hw_devices $device
close_hw_manager
```
///

每次写的时候需要写一个`top.v`文件。约束文件我使用的是`nexysa7.xdc`。

有些地方可以根据自己的需求进行修改一下。

写完了以后可以直接

```bash
make
```

就会输出二进制文件，然后烧录到开发板，可以直接

```bash
make prog
```

如果需要清理工作目录，直接

```bash
make clean
```

由于我懒得在不同平台编译（他们输出的文件是互相兼容的），我在`.gitignore`里面没有加`.bit`文件，可以参考：

/// details | .gitignore
    type: plain
```git
.Xil/
*.log
*.jou
*.html
*.xml
```
///
