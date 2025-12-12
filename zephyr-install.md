# Ubuntu

Use ``apt`` to install the required dependencies:

sudo apt install --no-install-recommends git cmake ninja-build gperf \
  ccache dfu-util device-tree-compiler wget python3-dev python3-venv python3-tk \
  xz-utils file make gcc gcc-multilib g++-multilib libsdl2-dev libmagic1


Due to the unavailability of ``gcc-multilib`` and ``g++-multilib`` on AArch64
(ARM64) systems, you may need to omit them from the list of packages to install.

## Zephyr 下载

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

winget source remove winget
winget source add winget https://mirrors.ustc.edu.cn/winget-source --trust-level trusted
winget install Kitware.CMake Ninja-build.Ninja oss-winget.gperf Python.Python.3.12 Git.Git oss-winget.dtc wget 7zip.7zip


## Zephyr 下载
cd $Env:HOMEPATH
python -m venv zephyrproject\.venv

Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

zephyrproject\.venv\Scripts\Activate.ps1

pip install west

west init zephyrproject
cd zephyrproject
west update

west zephyr-export

west packages pip --install


# 浅克隆方法

west init zephyrproject --clone-opt=--depth=15
west update --fetch-opt=--depth=15

# west sdk install
注意要在zephyrproject文件夹下运行才有用


```bash
west sdk install --help
usage: west sdk install [-h] [--version [SDK_VER]] [-b BASE] [-d DIR] [-i] [-t toolchain_name [toolchain_name ...]] [-T] [-H]
                        [--personal-access-token PERSONAL_ACCESS_TOKEN] [--api-url API_URL]

options:
  -h, --help            show this help message and exit
  --version [SDK_VER]   version of the Zephyr SDK to install. If not specified, the install version is detected from
                        ${ZEPHYR_BASE}/SDK_VERSION file.
  -b, --install-base BASE
                        Base directory to SDK install. The subdirectory created by extracting the archive in <BASE> will be the SDK
                        installation directory. For example, -b /foo/bar will install the SDK in `/foo/bar/zephyr-sdk-<version>'.
  -d, --install-dir DIR
                        SDK install destination directory. The SDK will be installed on the specified path. The directory contained
                        in the archive will be renamed and installed for the specified directory. For example, if you specify -d
                        /foo/bar/baz, The archive's zephyr-sdk-<version> directory will be renamed baz and placed under /foo/bar. If
                        this option is specified, the --install-base option is ignored.
  -i, --interactive     launches installer in interactive mode. --toolchains, --no-toolchains and --no-hosttools will be ignored if
                        this option is enabled.
  -t, --toolchains toolchain_name [toolchain_name ...]
                        toolchain(s) to install (e.g. 'arm-zephyr-eabi'). If this option is not given, toolchains for all
                        architectures will be installed. If you are unsure which one to install, install all toolchains. This
                        requires downloading several gigabytes and the corresponding disk space.Each Zephyr SDK release may include
                        different toolchains; see the release notes at https://github.com/zephyrproject-rtos/sdk-ng/releases.
  -T, --no-toolchains   do not install toolchains. --toolchains will be ignored if this option is enabled.
  -H, --no-hosttools    do not install host-tools.
  --personal-access-token PERSONAL_ACCESS_TOKEN
                        GitHub personal access token.
  --api-url API_URL     GitHub releases API endpoint used to look for Zephyr SDKs.

Installing SDK:

    Run 'west sdk install' to install Zephyr SDK.

    Set --version option to install a specific version of the SDK.
    If not specified, the install version is detected from "${ZEPHYR_BASE}/SDK_VERSION file.
    SDKs older than 0.14.1 are not supported.

    You can specify the installation directory with --install-dir or --install-base.
    If the specified version of the SDK is already installed,
    the already installed SDK will be used regardless of the settings of
    --install-dir and --install-base.

    Typically, Zephyr SDK archives contain only one directory named zephyr-sdk-<version>
    at the top level.
    The SDK archive is extracted to the home directory if both --install-dir and --install-base
    are not specified.
    In this case, SDK will install into ${HOME}/zephyr-sdk-<version>.
    If --install-base is specified, the archive will be extracted under the specified path.
    In this case, SDK will install into <BASE>/zephyr-sdk-<version> .
    If --install-dir is specified, the directory contained in the archive will be renamed
    and placed to the specified location.

    --interactive, --toolchains, --no-toolchains and --no-hosttools options
    specify the behavior of the installer. Please see the description of each option.

    --personal-access-token specifies the GitHub personal access token.
    This helps to relax the limits on the number of REST API calls.

    --api-url specifies the REST API endpoint for GitHub releases information
    when installing the SDK from a different GitHub repository.
```
```
```
```





# tauri file dialog

JavaScript
可以在 JavaScript API 参考中查看所有 Dialog 选项。

创建 Yes/No 对话框
显示一个带有 “Yes” 和 “No” 按钮的提问对话框。

import { ask } from '@tauri-apps/plugin-dialog';

// 创建 Yes/No 对话框
const answer = await ask('This action cannot be reverted. Are you sure?', {
  title: 'Tauri',
  kind: 'warning',
});

console.log(answer);
// Prints boolean to the console

创建 Ok/Cancel 对话框
显示一个带有 “Ok” 和 “Cancel” 按钮的提问对话框。

import { confirm } from '@tauri-apps/plugin-dialog';

// Creates a confirmation Ok/Cancel dialog
const confirmation = await confirm(
  'This action cannot be reverted. Are you sure?',
  { title: 'Tauri', kind: 'warning' }
);

console.log(confirmation);
// Prints boolean to the console

创建 Message 对话框
一个带有 “Ok” 按钮的消息对话框。请注意，如果用户关闭对话框，它将返回 false。

import { message } from '@tauri-apps/plugin-dialog';

// Shows message
await message('File not found', { title: 'Tauri', kind: 'error' });

打开一个文件选择对话框
打开一个文件/目录选择对话框。

multiple 选项控制对话框是否允许多重选择，而 directory 则控制对话框是否允许目录选择。

import { open } from '@tauri-apps/plugin-dialog';

// Open a dialog
const file = await open({
  multiple: false,
  directory: false,
});
console.log(file);
// Prints file path and name to the console

保存到文件对话框
打开一个文件/目录保存对话框。

import { save } from '@tauri-apps/plugin-dialog';
// Prompt to save a 'My Filter' with extension .png or .jpeg
const path = await save({
  filters: [
    {
      name: 'My Filter',
      extensions: ['png', 'jpeg'],
    },
  ],
});
console.log(path);
// Prints the chosen path

Rust
请参阅 Rust API 参考以查看所有可用选项。

建立一个询问对话框
显示一个带有 “Absolutely” 和 “Totally” 按钮的问题对话框。

use tauri_plugin_dialog::DialogExt;

let answer = app.dialog()
        .message("Tauri is Awesome")
        .title("Tauri is Awesome")
        .ok_button_label("Absolutely")
        .cancel_button_label("Totally")
        .blocking_show();

如果你需要一个非阻塞操作，你可以使用 show()：

use tauri_plugin_dialog::DialogExt;

app.dialog()
    .message("Tauri is Awesome")
    .title("Tauri is Awesome")
    .ok_button_label("Absolutely")
    .cancel_button_label("Totally")
    .show(|result| match result {
        true => // do something,
        false =>// do something,
    });

建立消息对话框
一个带有 “Ok” 按钮的消息对话框。请注意，如果用户关闭对话框，它将返回 false。

use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

let ans = app.dialog()
    .message("File not found")
    .kind(MessageDialogKind::Error)
    .title("Warning")
    .blocking_show();

如果你需要一个非阻塞操作，你可以使用 show()：

use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

app.dialog()
    .message("Tauri is Awesome")
    .kind(MessageDialogKind::Info)
    .title("Information")
    .ok_button_label("Absolutely")
    .show(|result| match result {
        true => // do something,
        false => // do something,
    });

建立一个文件选择器对话框
选择文件
use tauri_plugin_dialog::DialogExt;

let file_path = app.dialog().file().blocking_pick_file();
// return a file_path `Option`, or `None` if the user closes the dialog

如果你需要一个非阻塞操作，你可以使用 show()：

use tauri_plugin_dialog::DialogExt;

app.dialog().file().pick_file(|file_path| {
    // return a file_path `Option`, or `None` if the user closes the dialog
    })

保存文件
use tauri_plugin_dialog::DialogExt;

let file_path = app
    .dialog()
    .file()
    .add_filter("My Filter", &["png", "jpeg"])
    .blocking_save_file();
    // do something with the optional file path here
    // the file path is `None` if the user closed the dialog

或者：

use tauri_plugin_dialog::DialogExt;

app.dialog()
    .file()
    .add_filter("My Filter", &["png", "jpeg"])
    .pick_file(|file_path| {
        // return a file_path `Option`, or `None` if the user closes the dialog
    });
