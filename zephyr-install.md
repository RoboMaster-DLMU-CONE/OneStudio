# Ubuntu

Use ``apt`` to install the required dependencies:

sudo apt install --no-install-recommends git cmake ninja-build gperf \
  ccache dfu-util device-tree-compiler wget python3-dev python3-venv python3-tk \
  xz-utils file make gcc gcc-multilib g++-multilib libsdl2-dev libmagic1


Due to the unavailability of ``gcc-multilib`` and ``g++-multilib`` on AArch64
(ARM64) systems, you may need to omit them from the list of packages to install.

Create a new virtual environment:

python3 -m venv ~/zephyrproject/.venv
Activate the virtual environment:

source ~/zephyrproject/.venv/bin/activate
Once activated your shell will be prefixed with (.venv). The virtual environment can be deactivated at any time by running deactivate.

Note

Remember to activate the virtual environment every time you start working.

Install west:

pip install west
Get the Zephyr source code:

west init ~/zephyrproject
cd ~/zephyrproject
west update
Export a Zephyr CMake package. This allows CMake to automatically load boilerplate code required for building Zephyr applications.

west zephyr-export
Install Python dependencies using west packages.

west packages pip --install

cd ~/zephyrproject/zephyr
west sdk install

# Windows

统一使用powershell环境。
使用Winget获取依赖。因为我们在国内环境，我们还要加上换源指令。

winget source remove winget
winget source add winget https://mirrors.ustc.edu.cn/winget-source --trust-level trusted
winget install Kitware.CMake Ninja-build.Ninja oss-winget.gperf Python.Python.3.12 Git.Git oss-winget.dtc wget 7zip.7zip

cd $Env:HOMEPATH
python -m venv zephyrproject\.venv

