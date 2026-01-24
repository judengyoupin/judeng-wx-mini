import graphqlOrmfyClientConfig from "../goc.config";

export const graphqlOrmifyClientConfig = {
  endpoint: graphqlOrmfyClientConfig.endpoint,
  headers: graphqlOrmfyClientConfig.headers,
};

// 后端API基础URL
// 注意：小程序环境不支持 process.env，直接使用常量配置
// 如需修改，请直接修改此处的值，或通过 manifest.json 的 env 配置
export const projectConfig = {
  apiBaseUrl: 'http://localhost:3000', // 开发环境默认值，生产环境需要修改
};