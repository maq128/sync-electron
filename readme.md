# 功能

对给定的两个文件夹进行比对，并对差异部分进行选择、同步。

# 初始构建 Vite + Electron 项目框架

```
yarn create vite sync-electron --template vue
yarn install

yarn add --dev electron
yarn add --dev concurrently wait-on cross-env
yarn add --dev @electron-forge/cli
npx electron-forge import

yarn add element-plus
yarn add @element-plus/icons-vue
yarn add mitt
yarn add ssh2
yarn add keytar
yarn add tmp

# 开发调试
yarn electron:serve

# 带命令行参数的开发调试
yarn dev
npx electron . --enable-reset-mtime
  - 或者 -
npx concurrently -k "yarn dev" "yarn electron --enable-reset-mtime"

# 打包
yarn package
```

# 参考资料

[Vite+Electron快速构建一个VUE3桌面应用](https://github.com/Kuari/Blog/issues/52)

[Vite 官方中文文档](https://cn.vitejs.dev/guide/)

[Electron](https://www.electronjs.org/zh/docs/latest/tutorial/quick-start)

[Electron Forge](https://www.electronforge.io/)

[Vue 3](https://v3.cn.vuejs.org/guide/introduction.html)

[Element Plus](https://element-plus.gitee.io/zh-CN/component/button.html)

[Mitt](https://github.com/developit/mitt)

[mscdex/ssh2](https://github.com/mscdex/ssh2)
	| [SFTP](https://github.com/mscdex/ssh2/blob/master/SFTP.md)

[How to securely store sensitive information in Electron with node-keytar](https://cameronnokes.com/blog/how-to-securely-store-sensitive-information-in-electron-with-node-keytar/)
	| [github](https://github.com/atom/node-keytar)
