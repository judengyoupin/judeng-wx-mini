# uniapp-ts-template

本项目为 uni-app + GraphQL 跨端开发模板，支持主包/分包结构，内置类型安全的 API 设计、缓存与请求工具，适合团队协作开发。

---

## 快速启动项目

1. **克隆项目**
   ```bash
   git clone <your-repo-url>
   cd uniapp-ts-template
   ```
2. **安装依赖**
   ```bash
   npm install
   ```
3. **配置 GraphQL 端点**
   - 修改 `goc.config.ts`，填写你的 GraphQL 服务地址和 header。
4. **拉取 schema 并生成类型**
   ```bash
   npm run download:schema
   ```
5. **运行开发环境**
   - 微信小程序：
     ```bash
     npm run dev:mp-weixin
     ```
   - H5：
     ```bash
     npm run dev:h5
     ```
6. **（可选）类型检查**
   ```bash
   npm run type-check
   ```

---

## 目录结构规范

```
uniapp-ts-template/
  src/
    api/                # 通用 API，主包/全局可用，按模块分目录
      resource/
        index.ts        # 资源相关通用 API
      user/
        index.ts        # 用户相关通用 API
    config-lib/         # 配置与工具库（原 utils 目录已迁移至此）
      cache-store/
        cache-store.ts  # 缓存工具
        config.ts
      hasura-graphql-client/
        hasura-graphql-client.ts # GraphQL 客户端实例
        config.ts
      ...               # 其他配置/工具模块
    pages/              # 主包页面（如 tabbar 页面），每个页面一个子目录
      index/
        index.vue       # 首页页面
      home/
        ...
    subPackages/        # 分包页面及其专属 API
      resource/
        index.vue       # 分包页面
        api.ts          # 分包专属 API
      other-package/
        index.vue
        api.ts
    static/             # 静态资源（如图片、icon 等）
      logo.png
    types/              # 全局类型定义
      graphql.ts        # GraphQL 自动生成类型
      # 建议可细分 tables/ 目录，按表拆分业务类型
    utils/              # （已废弃/仅保留极少量工具，主力已迁移到 config-lib/）
    project-config.ts   # 项目配置（如 endpoint、header，建议仅工具脚本用）
    pages.json          # uni-app 路由与页面配置
    manifest.json       # uni-app 项目配置
    uni.scss            # 全局样式
    main.ts             # 入口文件
    App.vue             # 根组件
  graphql/
    schema.graphql      # GraphQL schema 文件（自动生成）
    codegen.ts          # graphql-codegen 配置
  goc.config.ts         # GraphQL 客户端配置
  package.json
  README.md
  tsconfig.json
  vite.config.ts
  ...
```

### 目录/文件职责说明

| 目录/文件 | 说明 |
|-----------|------|
| src/api/  | 通用 API，主包/全局可用，按模块分子目录，index.ts 为模块主入口 |
| src/config-lib/ | 配置与工具库，缓存、GraphQL 客户端等） |
| src/pages/ | 主包页面，每个页面一个子目录，页面文件为 index.vue |
| src/subPackages/ | 分包页面，每个分包一个子目录，页面和专属 API 文件同级 |
| src/types/ | 全局类型定义，graphql.ts 为自动生成类型，建议 tables/ 拆分业务类型 |
| src/utils/ | （业务相关的工具库）|
| src/static/ | 静态资源，如图片、icon 等 |
| src/project-config.ts | 项目配置（如 endpoint、header，建议仅工具脚本用） |
| graphql/schema.graphql | GraphQL schema 文件，自动生成 |
| graphql/codegen.ts | graphql-codegen 配置文件 |
| goc.config.ts | GraphQL 客户端配置（endpoint、header） |
| package.json | 项目依赖与脚本配置 |
| README.md | 项目说明文档 |
| tsconfig.json | TypeScript 配置 |
| vite.config.ts | Vite 构建配置 |

---

## 目录与命名风格规范

- **页面目录与页面文件**：
  - 统一使用英文小写+中划线（-），如 `user-center/`、`order-list/`、`index.vue`。
  - 页面文件建议为 `index.vue`，页面目录名即为页面名。
- **API 相关文件**：
  - 统一使用英文小写+下划线（_），如 `api.ts`、`user_api.ts`。
  - api 目录下每个模块一个子目录，模块主入口为 `index.ts`。
  - 分包 API 文件建议为 `api.ts`，与页面同级。
- **工具库文件**：
  - 统一使用英文小写+中划线（-），如 `cache-store.ts`、`hasura-graphql-client.ts`。
  - 现已全部集中在 `config-lib/` 目录下。
- **类型定义文件**：
  - 统一使用英文小写+中划线或下划线，自动生成类型为 `graphql.ts`，业务类型建议细分到 `tables/` 子目录。
- **静态资源**：
  - 文件名用英文小写+中划线（-），如 `logo.png`。

#### 命名规范小结

| 类型         | 命名风格           | 示例                      |
|--------------|--------------------|---------------------------|
| 页面目录     | 小写+中划线        | user-center/              |
| 页面文件     | 小写+中划线        | index.vue                 |
| API 文件     | 小写+下划线        | api.ts, user_api.ts       |
| 工具库文件   | 小写+中划线        | cache-store.ts            |
| 类型定义文件 | 小写+中划线/下划线 | graphql.ts, tables/user.ts|
| 静态资源     | 小写+中划线        | logo.png                  |

---

## 推荐开发流程

1. 新建页面或分包时，严格按目录规范新建目录和文件。
2. 新增 API 时，主包 API 放 api/下对应模块，分包 API 放分包目录下，命名用下划线。
3. 新增类型时，优先基于自动生成的 graphql.ts，业务类型建议细分 tables/。
4. 工具函数统一放 utils/，命名用中划线。
5. 静态资源统一放 static/，命名用中划线。
6. 每次后端 schema 变更后，务必 `npm run download:schema` 同步类型。

---

## 典型用例

### 1. API 文件用法

```ts
// src/subPackages/resource/api.ts
import cacheStore from '@/config-lib/cache-store/cache-store';
import client from '@/config-lib/hasura-graphql-client/hasura-graphql-client';
import type { Resources } from '@/types/graphql';

export const get_resource_list = cacheStore.cache(
  async (args: Record<string, any> = {}): Promise<Resources[]> => {
    return await client.datas<Resources>({
      table: 'resources',
      args,
      datas_fields: ['id', 'name', 'description'],
    });
  }
);
```

### 2. 类型定义用法

```ts
// src/types/tables/resource.ts
import type { Resources, Resources_Bool_Exp } from '../graphql';
export type Resource = Resources;
export type ResourceWhere = Resources_Bool_Exp;
export type ResourceField = keyof Resources;
export type ResourceFields = ResourceField[];
```

### 3. 页面用法

```vue
<script lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { get_resource_list } from '@/subPackages/resource/api';
import type { Resource } from '@/types/tables/resource';

export default {
  setup() {
    const resources = ref<Resource[]>([]);
    onLoad(async () => {
      resources.value = await get_resource_list({ category: 'banner' });
    });
    return { resources };
  },
};
</script>
```

---

## 常用脚本

- 拉取 schema 并生成类型：
  ```bash
  npm run download:schema
  ```
- 运行到微信小程序：
  ```bash
  npm run dev:mp-weixin
  ```
- 运行到 H5：
  ```bash
  npm run dev:h5
  ```
- 类型检查：
  ```bash
  npm run type-check
  ```

---

## 开发建议

- API、类型、工具、页面结构建议严格按本规范组织，便于团队协作和维护。
- 业务类型建议基于自动生成的 GraphQL 类型二次封装，字段名类型用 `keyof` 自动推导。
- 缓存、请求、GraphQL 客户端等统一用 config-lib/ 目录下工具，API 推荐全部加缓存。
- 每次后端 schema 变更后，务必同步类型。

---

## 常见目录/文件 FAQ

- **api/ 下可以有多级目录吗？** 可以，建议每个业务模块一个子目录，主入口为 index.ts。
- **types/ 下如何拆分业务类型？** 建议 tables/ 下每个表一个 ts 文件，便于维护和自动补全。
- **分包页面可以有多个页面和 API 吗？** 可以，分包目录下可有多个页面和多个 API 文件。
- **静态资源如何组织？** 建议按业务或类型分子目录，如 images/、icons/。
- **工具库可以有多文件吗？** 可以，按功能拆分多个 ts 文件，命名用中划线。
- **config-lib/ 和 utils/ 有什么区别？** config-lib/ 是当前主力的配置与工具库目录，utils/ 封装轻量化的业务使用工具/。

---

如有疑问或需补充，请联系项目维护者。
#   j u d e n g - w x - m i n i  
 