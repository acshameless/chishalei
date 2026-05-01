# 吃啥嘞

> 中午不知道吃啥？问问天意。

一个河南风味的午餐随机选择器，预设 35 道中原本地吃食，支持自定义添加和删除。

**线上地址：** [chisha.shameless.top](https://chisha.shameless.top)

---

## 功能

- **问问天意** — 点击后随机抽签，带扫光动效和减速收尾
- **就这个了** — 转动中再次点击，立即定在当前显示的菜
- **自定义菜单** — 在"全部选项"旁直接输入，回车或点 ＋ 添加，悬停可删除
- **手动选择** — 点击任意标签直接指定，跳过随机

## 本地运行

不需要任何构建工具，直接用浏览器打开即可：

```bash
# 克隆仓库
git clone https://github.com/yourname/chishanle.git
cd chishanle

# 直接打开
open index.html
```

## 部署到 Vercel

**方式一：拖拽上传**

1. 将 `index.html` 重命名为… 保持 `index.html` 即可
2. 打开 [vercel.com](https://vercel.com) → Add New → Project
3. 选择 Browse，上传文件，Deploy

**方式二：GitHub 自动部署**

1. 推送到 GitHub 仓库
2. Vercel 导入该仓库，框架选 **Other**
3. 之后每次 `git push` 自动触发重新部署

**绑定子域名**

在 Vercel 项目设置 → Domains 中添加 `chisha.shameless.top`，然后在域名服务商处添加 CNAME 记录：

```
chisha  CNAME  cname.vercel-dns.com
```

## 技术栈

纯原生，零依赖。

- HTML / CSS / JavaScript
- 字体：[Shippori Mincho B1](https://fonts.google.com/specimen/Shippori+Mincho+B1) + [Zen Kaku Gothic New](https://fonts.google.com/specimen/Zen+Kaku+Gothic+New)（Google Fonts）

## 预设菜单

以河南中原饮食为主，覆盖郑州、开封、洛阳、信阳、周口等地特色：

烩面、胡辣汤、灌汤包、羊肉汤、浆面条、道口烧鸡、鲤鱼焙面、水煎包、炒凉粉、杠子馍、菜馍、油茶、豆腐脑、红焖羊肉、卤面、炸紫酥肉、桶子鸡、烧饼夹肉、焦饼、葱油饼、蒸饺、煎包、板面、扁粉菜、臊子面、信阳焖罐肉、南阳黄牛肉、周口羊肉汤、许昌卤面、新乡烧饼、洛阳水席、开封炒凉粉、逍遥胡辣汤、三鲜烩面、萝卜丝饼

---

每顿饭都将就不得。
