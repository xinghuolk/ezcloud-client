以下是你提供的前端字体与颜色样式的修改需求整理，已转换为 Markdown 格式，便于在文档或团队协作中查看和跟踪。

---

# 🎨 前端样式修改需求整理（字体与颜色）

## 🧭 布局区域调整

| 区域        | 原属性                                         | 修改内容           |
| --------- | ------------------------------------------- | -------------- |
| Header    | 高度 `60px`                                   | **改为 `100px`** |
| Middle    | `margin-top: 40px`                          | ❌ **删除**       |
| Header 背景 | `#edf3fa`                                   | 浅蓝             |
| Middle 背景 | `linear-gradient(180deg, #edf3fa, #d5e8df)` | 渐变色            |
| Footer 背景 | `#d5e8df`                                   | 浅绿             |

---

## 🌈 色彩变量（明亮模式）

### 主要颜色

| 变量名         | 名称                   | 色调        | 替代色       | 备注                        |
| ----------- | -------------------- | --------- | --------- | ------------------------- |
| `--primary` | 主色调 - Slime Girl     | `#00b885` | `#00b08c` | oklch(66.67% .146 173.07) |
| `--success` | 成功色 - Envy’s Love    | `#34cd9b` | `#05d69e` | Pristine Oceanic          |
| `--info`    | 信息色 - Magical Merlin | `#488ac9` | `#0398e2` |                           |
| `--warning` | 警告色 - ORR的橙色         | `#f9aa31` | `#faad42` |                           |
| `--danger`  | 危险色 - 红衣主教           | `#c41e3a` | `#e62864` |                           |

### 文字颜色

| 变量名            | 名称                              | 色值                                |
| -------------- | ------------------------------- | --------------------------------- |
| `--dark-text`  | 主要文字 - Haunted Forest           | `#002417` / `#283252`             |
| `--light-text` | 次要文字 - Steel Gray / Mecha Metal | `#727480` / `#a2a5b9` / `#848694` |
| `--muted-grey` | 浅色文字                            | `#727480` / `#999999`             |
| `--white`      | 白色文字                            | `#ffffff`                         |

---

## 🌑 暗黑模式适配

### 文字颜色（暗黑模式）

| 变量名            | 名称                                  | 色值                    |
| -------------- | ----------------------------------- | --------------------- |
| `--dark-text`  | 主要文字 - Fly a Kite                   | `#c8dcf0` / `#fcfcfc` |
| `--light-text` | 次要文字 - Icelandic Winter / Dark Gray | `#d5e8df` / `#a9a9b2` |
| `--muted-grey` | 辅助文字                                | `#d5e8df`             |
| `--danger`     | 危险色 - Watermelon                    | `#f74d5d`             |
| `--warning`    | 警告色 - Caramel Popcorn               | `#fab350`             |

### 布局渐变（暗黑模式）

| 区域     | 背景色                                            |
| ------ | ---------------------------------------------- |
| Header | `#0d2236` 深蓝                                   |
| Middle | `linear-gradient(180deg, #0d2236, #002417)` 渐变 |
| Footer | `#002417` 深绿                                   |

---

## 🔤 字体系统

| 变量名                | 用途     | 字体                                   |
| ------------------ | ------ | ------------------------------------ |
| `--font`           | 主要字体   | `'Roboto Flex Variable', sans-serif` |
| `--font-alt`       | 替代字体   | `'Montserrat Variable', sans-serif`  |
| `--font-monospace` | 等宽字体   | `'Fira Code Variable', monospace`    |
| `--font-size`      | 默认基础字号 | `14px`                               |

---

## 🧱 字体字号与样式细节

### 标题

| 元素   | class          | 颜色变量      | 字号               |
| :----- | :------------- | :------------ | :----------------- |
| `h1`   | `title is-3`   | `--dark-text` | `1.75rem = 28px` |
| `h2`   | `title is-4`   | `--dark-text` | `1.5rem = 24px`  |
| `h3`   | `title is-5`   | `--dark-text` | `1.25rem = 20px` |
| `h4`   | `title is-6`   | `--dark-text` | `1rem = 16px`    |

### 正文与副标题

| 用途       | class                  | 颜色变量       | 字号              |
| :--------- | :--------------------- | :------------- | :---------------- |
| 副标题     | `subtitle is-6`        | `--light-text` | `1rem = 16px`     |
| 正文 (次要) | `common-text-light`    | `--light-text` | `0.9rem = 14.4px` |
| 正文 (主色) | `common-text-primary`  | `--primary`    | `1.5rem = 24px`   |
| 正文 (成功) | `common-text-success`  | `--success`    | `1.5rem = 24px`   |
| 正文 (危险) | `common-text-danger`   | `--danger`     | `1rem = 16px`     |
| 正文 (警告) | `common-text-warning`  | `--warning`    | `1rem = 16px`     |

### 链接与强调

| 用途       | 建议元素 / class            | 颜色变量      | 字号          |
| :--------- | :-------------------------- | :------------ | :------------ |
| 链接       | `a`                         | `--primary`   | `1rem = 16px` |
| 强调 (加粗) | `has-text-weight-semibold`  | `--dark-text` | `1rem = 16px` |
| 强调 (更粗) | `has-text-weight-bold`      | `--dark-text` | `1rem = 16px` |

### 辅助类文字

| 用途           | class                 | 颜色变量       | 字号                   | 补充说明               |
| :------------- | :-------------------- | :------------- | :--------------------- | :--------------------- |
| 帮助文本       | `help`                | `--light-text` | `0.8rem = 12.8px`      |                        |
| 表单错误提示   | `help is-danger`      | `--danger`     | `0.8rem = 12.8px`      |                        |
| 表单成功提示   | `help is-success`     | `--success`    | `0.8rem = 12.8px`      |                        |
| 日期文字       | `common-date-text`    | `--muted-grey` | `0.85rem = 13.6px`     |                        |
| 统计数字       | `stats-number`        | `--dark-text`  | `1.8rem = 28.8px`      |                        |
| 表格项目名称   | `common-item-name`    | `--dark-text`  | `1rem = 16px`          | `font-weight: 600`     |

---

如需生成 CSS 文件或 Sass 变量表，也可告诉我，我可以帮你转换格式或输出到对应的代码。
