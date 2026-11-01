# music/ —— 原曲源文件（只在本机）

lovelive！mori⭐mens！要放的原曲 mp3 放这儿。**这个目录不进仓库**（`.gitignore` 里挡着），
入库的只有打包后的密文 `assets/ll-music/*.bin` 和清单 `data/ll-music.json`。

```bash
py scripts/ll-music.py --list    # 十七首各要什么文件名
py scripts/ll-music.py           # music/ 里能对上的都打包
py scripts/ll-music.py --clean   # 反悔：删掉包和清单
```

文件名写成 `<曲目 id>.mp3` 最省事（`snow.mp3`、`wanshen.mp3`…），
也可以随便起名——脚本会按曲名关键词模糊匹配，一个文件只对一首。

打包是 AES-GCM 封装，浏览器取回来自己在 `js/ll/musicbox.js` 里解。
**这不是版权保护**：密钥就在脚本里，肯读代码的人都能解。它只解决一件事——
仓库里不出现能直接播放的音频，也不会被当成公开下载源。曲子版权归原权利人。
